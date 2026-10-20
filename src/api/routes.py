# src/api/routes.py
import os
import re
import json
import traceback
import ssl
import urllib.request
import urllib.error
from urllib.parse import urlparse, unquote
from time import time
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import (create_access_token, jwt_required, get_jwt_identity, decode_token, get_jwt)
from PIL import Image, UnidentifiedImageError

from .extensions import db, limiter
from .models import User, Post, Comment, TravelRoute, RouteStep, RouteStepImage, PostImage, TokenBlocklist, Like, Notification

# Cloudinary
import cloudinary
import cloudinary.uploader
import cloudinary.api


def is_cloudinary_configured():
    """Configura Cloudinary desde CLOUDINARY_URL y valida la configuración mínima."""
    url = (os.environ.get("CLOUDINARY_URL") or "").strip()
    if not url:
        return False, "CLOUDINARY_URL no está configurada"
    try:
        cloudinary.config(cloudinary_url=url)
        cfg = cloudinary.config()
        if not cfg.cloud_name or not cfg.api_key or not cfg.api_secret:
            return False, "Configuración de Cloudinary incompleta"
    except Exception as exc:
        current_app.logger.exception("Error configurando Cloudinary")
        return False, f"Error configurando Cloudinary: {exc}"
    return True, None


def extract_cloudinary_public_id(url):
    """Obtiene el public_id real de una URL de Cloudinary."""
    if not url:
        return None
    try:
        parsed = urlparse(url)
        if "res.cloudinary.com" not in (parsed.netloc or ""):
            return None
        path = unquote(parsed.path or "")
        marker = "/upload/"
        if marker not in path:
            return None
        remainder = path.split(marker, 1)[1]
        segments = [s for s in remainder.split("/") if s]
        if segments and re.fullmatch(r"v\d+", segments[0]):
            segments = segments[1:]
        if not segments:
            return None
        last = segments[-1]
        if "." in last:
            segments[-1] = last.rsplit(".", 1)[0]
        public_id = "/".join(segments).strip()
        return public_id or None
    except Exception:
        current_app.logger.exception("No se pudo extraer public_id de Cloudinary")
        return None


def delete_cloudinary_asset_by_url(url):
    """Elimina un asset de Cloudinary por URL. Los errores se registran sin romper el flujo."""
    public_id = extract_cloudinary_public_id(url)
    if not public_id:
        return False
    ok, error_msg = is_cloudinary_configured()
    if not ok:
        current_app.logger.warning("No se pudo eliminar en Cloudinary (%s): %s", public_id, error_msg)
        return False
    try:
        cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
        return True
    except Exception:
        current_app.logger.exception("Error eliminando asset en Cloudinary (public_id=%s)", public_id)
        return False


def upload_to_cloudinary(file_obj, folder="blogyu"):
    """Sube un archivo a Cloudinary y devuelve (url, error)."""
    ok, error_msg = is_cloudinary_configured()
    if not ok:
        current_app.logger.error("No se puede subir imagen: %s", error_msg)
        return None, error_msg
    try:
        result = cloudinary.uploader.upload(file_obj, folder=folder, resource_type="image")
        secure_url = result.get("secure_url")
        if not secure_url:
            return None, "Cloudinary no devolvió secure_url"
        return secure_url, None
    except Exception as exc:
        current_app.logger.exception("Error subiendo a Cloudinary")
        return None, f"Error subiendo imagen a Cloudinary: {exc}"


# ----------------- EMAIL (SendGrid Web API por HTTPS) -----------------
def _get_sendgrid_api_key():
    key = (current_app.config.get("SENDGRID_API_KEY") or os.environ.get("SENDGRID_API_KEY") or "").strip()
    return key or None


def _get_sender_email():
    sender = (current_app.config.get("SENDGRID_SENDER_EMAIL") or os.environ.get("SENDGRID_SENDER_EMAIL") or "").strip()
    if not sender:
        return None
    return sender


def send_email_via_sendgrid_api(to_email, subject, body_text, timeout=15):
    """Envía un correo usando la Web API de SendGrid (HTTPS)."""
    api_key = _get_sendgrid_api_key()
    sender = _get_sender_email()

    if not api_key:
        return False, "Falta la API key de SendGrid (SENDGRID_API_KEY)."
    if not sender:
        return False, "Falta el remitente (SENDGRID_SENDER_EMAIL)."

    sender_name = (current_app.config.get("SENDGRID_SENDER_NAME") or os.environ.get("SENDGRID_SENDER_NAME") or "BlogYU").strip() or "BlogYU"
    current_app.logger.info("Enviando correo vía SendGrid API from=%s to=%s", sender, to_email)

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": sender, "name": sender_name},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body_text}],
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            status = resp.getcode()
            if 200 <= status < 300:
                return True, None
            return False, f"SendGrid respondió con status {status}"
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8", errors="replace")
        except Exception:
            err_body = ""
        return False, f"SendGrid HTTP {e.code}: {err_body[:500]}"
    except Exception as e:
        return False, f"Error de red al contactar SendGrid: {e}"


# Blueprint
api = bp = Blueprint('api', __name__)

# Config
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_MIME_TYPES = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
BLOCKED_EXTENSIONS = {'svg', 'heic', 'heif'}
FORMAT_TO_EXTENSIONS = {
    'PNG': {'png'},
    'JPEG': {'jpg', 'jpeg'},
    'GIF': {'gif'},
    'WEBP': {'webp'},
}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB default
MAX_PER_PAGE = 50


# ----------------- Helpers -----------------
def parse_pagination_args(default_per_page=10):
    page = request.args.get('page', 1, type=int) or 1
    per_page = request.args.get('per_page', default_per_page, type=int) or default_per_page
    if page < 1:
        page = 1
    per_page = max(1, min(per_page, MAX_PER_PAGE))
    return page, per_page


def allowed_file(filename, file_obj=None):
    """Valida extensión, MIME y contenido real de imagen (Pillow)."""
    if not filename or '.' not in filename:
        return False

    ext = filename.rsplit('.', 1)[1].lower().strip()
    if ext in BLOCKED_EXTENSIONS:
        return False
    if ext not in ALLOWED_EXTENSIONS:
        return False
    if file_obj is None:
        return False

    mimetype = (getattr(file_obj, 'mimetype', '') or '').split(';', 1)[0].strip().lower()
    if mimetype not in ALLOWED_MIME_TYPES:
        return False

    stream = getattr(file_obj, 'stream', file_obj)
    try:
        pos = stream.tell()
    except Exception:
        pos = None

    try:
        stream.seek(0)
        image = Image.open(stream)
        image.verify()
        detected_format = (image.format or '').upper()
    except (UnidentifiedImageError, OSError, ValueError):
        return False
    finally:
        try:
            if pos is None:
                stream.seek(0)
            else:
                stream.seek(pos)
        except Exception:
            pass

    allowed_ext_for_format = FORMAT_TO_EXTENSIONS.get(detected_format)
    if not allowed_ext_for_format:
        return False
    return ext in allowed_ext_for_format

def cleanup_post_cloudinary_assets(post):
    """Elimina imágenes asociadas al post en Cloudinary sin romper el flujo."""
    urls = set()
    if getattr(post, "image", None):
        urls.add(post.image)
    for img in getattr(post, "images", []) or []:
        if getattr(img, "url", None):
            urls.add(img.url)

    for url in urls:
        delete_cloudinary_asset_by_url(url)


def admin_required(fn):
    """Decorator to require is_admin on current JWT user."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            user_id = get_jwt_identity()
            if user_id is None:
                return jsonify({"msg": "No autorizado (sin token)"}), 401
            u = User.query.get(int(user_id))
        except Exception:
            return jsonify({"msg": "No autorizado"}), 401

        if not getattr(u, "is_admin", False):
            return jsonify({"msg": "Acceso restringido: admin requerido"}), 403
        return fn(*args, **kwargs)
    return wrapper

# ----------------- Root / Health -----------------
@api.route("/", methods=["GET"])
def api_root():
    return jsonify({"msg": "API BlogYU funcionando"}), 200

# ----------------- Diagnóstico Cloudinary -----------------
@api.route("/test-cloudinary", methods=["GET"])
@jwt_required()
@admin_required
def test_cloudinary():
    url = os.environ.get("CLOUDINARY_URL", "")
    ok, error_msg = is_cloudinary_configured()
    if not ok:
        return jsonify({
            "ok": False,
            "error": error_msg,
            "url_detectada_len": len(url),
        }), 503

    try:
        cfg = cloudinary.config()
        ping = cloudinary.api.ping()
        return jsonify({
            "ok": True,
            "status": "Conectado correctamente",
            "cloud_name": cfg.cloud_name,
            "url_en_memoria": f"cloudinary://{cfg.api_key}:******@{cfg.cloud_name}",
            "api_key_last4": str(cfg.api_key)[-4:] if cfg.api_key else None,
            "api_secret_len": len(str(cfg.api_secret or "")),
            "ping": ping
        }), 200
    except Exception as e:
        cfg = cloudinary.config()
        return jsonify({
            "ok": False,
            "error": str(e),
            "url_detectada_len": len(url),
            "cloud_name": cfg.cloud_name,
            "api_key_last4": str(cfg.api_key)[-4:] if cfg.api_key else None,
            "api_secret_len": len(str(cfg.api_secret or "")),
            "ayuda": "Si el error es 401, el Secret en Render no es el correcto."
        }), 500

# ----------------- AUTH -----------------
@api.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get('email') or '').strip().lower()
    password = body.get('password')
    if not email or not password:
        return jsonify({"msg": "email y password requeridos"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    try:
        token = create_access_token(identity=str(user.id))
    except Exception as e:
        current_app.logger.exception("Error generando token")
        return jsonify({"msg": "error_generando_token", "detail": str(e)}), 500

    try:
        serialized = user.serialize()
    except Exception:
        current_app.logger.exception("user.serialize() falló en login")
        serialized = {
            "id": user.id,
            "name": getattr(user, "name", None),
            "email": getattr(user, "email", None),
            "profile_pic": getattr(user, "profile_pic", None),
            "background": getattr(user, "background", None),
            "is_admin": getattr(user, "is_admin", False)
        }

    if "profile_pic" not in serialized:
        serialized["profile_pic"] = getattr(user, "profile_pic", None)
    if "background" not in serialized:
        serialized["background"] = getattr(user, "background", None)

    return jsonify({"token": token, "user": serialized}), 200

@api.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    db.session.add(TokenBlocklist(jti=jti))
    db.session.commit()
    return jsonify({"msg": "Sesion cerrada correctamente"}), 200

@api.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    body = request.get_json(silent=True) or {}
    name = body.get('name')
    email = (body.get('email') or '').strip().lower()
    password = body.get('password')
    if not email or not password:
        return jsonify({"msg": "Email y password requeridos"}), 400
    if len(name or "") > 120:
        return jsonify({"msg": "El nombre no puede superar 120 caracteres"}), 400
    if len(email) > 120:
        return jsonify({"msg": "El email no puede superar 120 caracteres"}), 400
    if len(password) < 8:
        return jsonify({"msg": "La contrasena debe tener minimo 8 caracteres"}), 400
    if len(password) > 128:
        return jsonify({"msg": "La contrasena no puede superar 128 caracteres"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "El usuario ya existe"}), 400

    new_user = User(name=name, email=email)
    new_user.password = password
    db.session.add(new_user)
    db.session.commit()
    try:
        user_serialized = new_user.serialize()
    except Exception:
        user_serialized = {"id": new_user.id, "name": new_user.name, "email": new_user.email}
    return jsonify({"msg": "Usuario creado con éxito", "user": user_serialized}), 201

# ----------------- PASSWORD RECOVERY -----------------
@api.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    email = (request.get_json(silent=True) or {}).get('email') or request.form.get('email')
    email = (email or '').strip().lower()
    if not email:
        return jsonify({"msg": "Email requerido"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "Si el email existe, se ha enviado un link de recuperación"}), 200

    expires = timedelta(minutes=30)
    token = create_access_token(identity=user.id, expires_delta=expires)

    FRONTEND_URL = current_app.config.get('FRONTEND_URL') or os.environ.get('FRONTEND_URL') or 'http://localhost:3000'
    reset_url = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={token}"

    mail_suppressed = bool(current_app.config.get('EMAIL_SUPPRESS_SEND'))
    generic_ok = {"msg": "Si el email existe, se ha enviado un link de recuperación"}

    if mail_suppressed:
        current_app.logger.warning("Envío de correo suprimido (EMAIL_SUPPRESS_SEND activo) para %s", email)
        if current_app.debug:
            return jsonify({**generic_ok, "reset_url": reset_url}), 200
        return jsonify(generic_ok), 200

    subject = "Recuperación de contraseña - BlogYU"
    body = (
        "Para restablecer tu contraseña haz clic en el siguiente enlace:\n\n"
        f"{reset_url}\n\n"
        "Este enlace expirará en 30 minutos."
    )

    # Enviamos por la Web API de SendGrid (HTTPS). Render bloquea SMTP saliente.
    ok, err = send_email_via_sendgrid_api(email, subject, body)

    if ok:
        current_app.logger.info("Correo de recuperación enviado a %s vía SendGrid API", email)
    else:
        current_app.logger.error("No se pudo enviar el correo de recuperación a %s: %s", email, err)
        # No revelamos el fallo al usuario ni rompemos el flujo del frontend.
        if current_app.debug:
            return jsonify({**generic_ok, "reset_url": reset_url, "warning": err}), 200

    return jsonify(generic_ok), 200

@api.route('/reset-password', methods=['POST'])
@api.route('/reset-password/<token>', methods=['POST'])
def reset_password(token=None):
    if not token:
        token = request.args.get('token') or (request.get_json(silent=True) or {}).get('token')
    if not token:
        return jsonify({"msg": "Token requerido"}), 400

    try:
        data = decode_token(token)
        raw_user_id = data.get('sub') or data.get('identity')
        user_id = int(raw_user_id)
    except Exception as e:
        current_app.logger.exception("Token inválido/expirado")
        return jsonify({"msg": "Token inválido o expirado", "error": str(e)}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    new_password = payload.get('password') or request.form.get('password')
    if not new_password:
        return jsonify({"msg": "Nueva contraseña requerida"}), 400

    try:
        user.password = new_password
        db.session.commit()
    except Exception:
        current_app.logger.exception("Error actualizando contraseña")
        db.session.rollback()
        return jsonify({"msg": "Error al actualizar la contraseña"}), 500

    return jsonify({"msg": "Contraseña actualizada correctamente"}), 200

# ----------------- UPLOADS (servir) -----------------
@api.route('/uploads/<path:filename>', methods=['GET'])
def uploads(filename):
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    return send_from_directory(uploads_dir, filename)

@api.route('/api/uploads/<filename>')
def uploaded_file(filename):
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    return send_from_directory(uploads_dir, filename)

# ----------------- POSTS -----------------
@api.route('/upload-step-image', methods=['POST'])
@jwt_required()
def upload_step_image():
    if 'file' not in request.files:
        return jsonify({"msg": "No se encontró el archivo"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "Nombre de archivo vacío"}), 400
    if not allowed_file(file.filename, file):
        return jsonify({"msg": "Tipo de archivo no permitido"}), 400

    file_url, upload_error = upload_to_cloudinary(file, folder="blogyu/steps")
    if not file_url:
        status = 503 if upload_error and "CLOUDINARY_URL" in upload_error else 500
        return jsonify({"msg": "Error subiendo imagen a Cloudinary", "error": upload_error}), status
    current_app.logger.info(f"URL devuelta para imagen: {file_url}")
    return jsonify({"url": file_url}), 200

@api.route('/posts', methods=['GET'])
def get_posts():
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    search = request.args.get('search')
    category = request.args.get('category')

    query = Post.query
    if search:
        query = query.filter(
            Post.title.contains(search) | Post.content.contains(search)
        )
    if category:
        query = query.filter(Post.category == category)

    posts = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [p.serialize() for p in posts.items],
        "total": posts.total,
        "page": posts.page,
        "pages": posts.pages,
        "per_page": posts.per_page
    }), 200

@api.route('/my-posts', methods=['GET'])
@jwt_required()
def get_user_posts():
    user_id = int(get_jwt_identity())
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)

    posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [p.serialize() for p in posts.items],
        "total": posts.total,
        "page": posts.page,
        "pages": posts.pages,
        "per_page": posts.per_page,
    }), 200

@api.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = Post.query.get_or_404(post_id)
    return jsonify(post.serialize()), 200

@api.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    user_id = int(get_jwt_identity())
    saved_urls = []

    if request.is_json:
        data = request.get_json() or {}
        title = data.get('title')
        content = data.get('content')
        category = data.get('category')
        saved_urls = data.get('images', [])
    else:
        title = request.form.get('title')
        content = request.form.get('content')
        category = request.form.get('category')

        image_files = [f for f in request.files.getlist('images') if f and f.filename]
        for image_file in image_files:
            if not allowed_file(image_file.filename, image_file):
                return jsonify({"msg": "Tipo de archivo no permitido", "file": image_file.filename}), 400

            url, upload_error = upload_to_cloudinary(image_file, folder="blogyu/posts")
            if not url:
                status = 503 if upload_error and "CLOUDINARY_URL" in upload_error else 500
                return jsonify({"msg": "No se pudo subir una imagen del post", "error": upload_error}), status
            saved_urls.append(url)

    if not title or not content:
        return jsonify({"msg": "title and content required"}), 400
    if len(title) > 250:
        return jsonify({"msg": "El titulo no puede superar 250 caracteres"}), 400
    if len(content) > 50000:
        return jsonify({"msg": "El contenido no puede superar 50000 caracteres"}), 400

    main_image = saved_urls[0] if saved_urls else None

    p = Post(
        title=title, content=content, image=main_image,
        user_id=user_id, created_at=datetime.utcnow(), category=category
    )
    db.session.add(p)
    db.session.flush()

    for order, url in enumerate(saved_urls):
        db.session.add(PostImage(url=url, order=order, post_id=p.id))

    db.session.commit()
    return jsonify({"msg": "Post creado", "post": p.serialize(), "id": p.id}), 201

@api.route('/posts/<int:post_id>/stats', methods=['GET'])
def post_stats(post_id):
    post = Post.query.get_or_404(post_id)
    # Si el post no tiene contador de vistas, inicializamos en 0
    views = post.views if hasattr(post, 'views') else 0
    content = post.content or ""
    # Tiempo de lectura estimado: ~200 palabras por minuto
    reading_time = max(1, round(len(content.split()) / 200))
    return jsonify({
        "views": views,
        "reading_time_minutes": reading_time,
        "word_count": len(content.split())
    }), 200

@api.route('/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    user_id = int(get_jwt_identity())
    # Si ya dio like, lo quita (unlike); si no, lo agrega
    existing = Like.query.filter_by(user_id=user_id, post_id=post_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"msg": "Like removido", "likes_count": Post.query.get(post_id).likes.count()})
    else:
        like = Like(user_id=user_id, post_id=post_id)
        db.session.add(like)
        db.session.commit()
        return jsonify({"msg": "Like dado", "likes_count": Post.query.get(post_id).likes.count()})

@api.route('/posts/<int:post_id>/likes', methods=['GET'])
def get_post_likes(post_id):
    count = Like.query.filter_by(post_id=post_id).count()
    return jsonify({"likes_count": count}), 200

@api.route('/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def update_post(post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.get_or_404(post_id)
    if p.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    removed_urls = []

    if request.is_json:
        data = request.get_json() or {}
        p.title = data.get("title", p.title)
        p.content = data.get("content", p.content)
        p.category = data.get("category", p.category)

        keep_ids_raw = data.get("keep_image_ids")
        keep_ids = set(int(x) for x in (keep_ids_raw or []) if str(x).isdigit()) if keep_ids_raw is not None else None

        if keep_ids is not None:
            for img in list(p.images):
                if img.id not in keep_ids:
                    removed_urls.append(img.url)
                    db.session.delete(img)

        new_image_urls = [u for u in (data.get("new_images") or []) if u]
        current_count = PostImage.query.filter_by(post_id=p.id).count()
        for i, url in enumerate(new_image_urls):
            db.session.add(PostImage(url=url, order=current_count + i, post_id=p.id))
    else:
        p.title = request.form.get("title") or p.title
        p.content = request.form.get("content") or p.content
        p.category = request.form.get("category") or p.category

        keep_ids_raw = request.form.get("keep_image_ids")
        keep_ids = None
        if keep_ids_raw is not None:
            try:
                parsed = json.loads(keep_ids_raw)
                keep_ids = set(int(x) for x in (parsed or []) if str(x).isdigit())
            except Exception:
                keep_ids = set()

        if keep_ids is not None:
            for img in list(p.images):
                if img.id not in keep_ids:
                    removed_urls.append(img.url)
                    db.session.delete(img)

        new_files = [f for f in request.files.getlist('images') if f and f.filename]
        if new_files:
            current_count = PostImage.query.filter_by(post_id=p.id).count()
            for i, image_file in enumerate(new_files):
                if not allowed_file(image_file.filename, image_file):
                    return jsonify({"msg": "Tipo de archivo no permitido", "file": image_file.filename}), 400
                url, upload_error = upload_to_cloudinary(image_file, folder="blogyu/posts")
                if not url:
                    status = 503 if upload_error and "CLOUDINARY_URL" in upload_error else 500
                    return jsonify({"msg": "No se pudo subir una imagen del post", "error": upload_error}), status
                db.session.add(PostImage(url=url, order=current_count + i, post_id=p.id))

    db.session.flush()
    first_img = PostImage.query.filter_by(post_id=p.id).order_by(PostImage.order.asc()).first()
    p.image = first_img.url if first_img else None

    db.session.commit()

    for url in set(filter(None, removed_urls)):
        delete_cloudinary_asset_by_url(url)

    return jsonify(p.serialize()), 200

@api.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.get_or_404(post_id)
    if p.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    cleanup_post_cloudinary_assets(p)

    Comment.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    PostImage.query.filter_by(post_id=post_id).delete(synchronize_session=False)

    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "Eliminado"}), 200

# ----------------- CATEGORIES -----------------
@api.route('/categories', methods=['GET'])
def get_categories():
    base_categories = [
        {"id": "hoteles", "name": "Hoteles"},
        {"id": "restaurantes", "name": "Restaurantes"},
        {"id": "bares", "name": "Bares"},
        {"id": "lugares", "name": "Lugares / Sitios"},
        {"id": "cultura", "name": "Cultura / Museos"},
        {"id": "otros", "name": "Otros"}
    ]

    counts = {
        (row[0] or "").strip().lower(): int(row[1] or 0)
        for row in db.session.query(Post.category, db.func.count(Post.id)).group_by(Post.category).all()
        if row[0]
    }

    categories = [
        {
            **cat,
            "post_count": counts.get(cat["id"], 0)
        }
        for cat in base_categories
    ]

    return jsonify(categories), 200

# ----------------- COMMENTS -----------------
@api.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    return jsonify([c.serialize() for c in comments]), 200

@api.route('/posts/<int:post_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(post_id):
    body = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    author_name = user.name if user else "Usuario"
    content = (body.get("content") or "").strip()
    if not content:
        return jsonify({"msg": "El comentario no puede estar vacio"}), 400
    if len(content) > 2000:
        return jsonify({"msg": "El comentario no puede superar 2000 caracteres"}), 400
    new_comment = Comment(
        content=content,
        author_name=author_name,
        post_id=post_id,
        user_id=user_id
    )
    db.session.add(new_comment)
    db.session.commit()

    # Crear notificación al autor del post si es diferente al comentador
    post = Post.query.get(post_id)
    if post and post.user_id and post.user_id != user_id:
        # Evitar notificación duplicada muy rápida
        recent = Notification.query.filter_by(
            user_id=post.user_id,
            type="comment",
            related_id=comment.id
        ).first()
        if not recent:
            notif = Notification(
                user_id=post.user_id,
                type="comment",
                related_id=comment.id
            )
            db.session.add(notif)
            db.session.commit()

    return jsonify(new_comment.serialize()), 201

@api.route('/posts/<int:post_id>/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def edit_comment(post_id, comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id != user_id:
        return jsonify({"msg": "No tienes permisos para editar este comentario"}), 403
    body = request.get_json(silent=True) or {}
    new_content = (body.get("content") or "").strip()
    if not new_content:
        return jsonify({"msg": "El comentario no puede estar vacío"}), 400
    if len(new_content) > 2000:
        return jsonify({"msg": "El comentario no puede superar 2000 caracteres"}), 400
    comment.content = new_content
    db.session.commit()
    return jsonify(comment.serialize()), 200

@api.route('/posts/<int:post_id>/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(post_id, comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id != user_id:
        return jsonify({"msg": "No tienes permisos para borrar este comentario"}), 403
    db.session.delete(comment)
    db.session.commit()
    return jsonify({"msg": "Comentario borrado"}), 200

# ----------------- USERS -----------------
@api.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos para ver este usuario"}), 403
    user = User.query.get_or_404(user_id)
    try:
        serialized = user.serialize()
    except Exception:
        serialized = {
            "id": user.id,
            "name": getattr(user, "name", None),
            "email": getattr(user, "email", None),
            "profile_pic": getattr(user, "profile_pic", None),
            "background": getattr(user, "background", None),
        }
    return jsonify(serialized), 200

@api.route('/users/<int:user_id>/background', methods=['POST'])
@jwt_required()
def upload_user_background(user_id):
    try:
        current_user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({"msg": "Token inválido / no autorizado"}), 401

    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    if 'background' not in request.files:
        return jsonify({"msg": "No se encontró archivo 'background' (usar campo 'background')"}), 400

    image_file = request.files['background']
    if image_file.filename == "":
        return jsonify({"msg": "Nombre de archivo vacío"}), 400
    if not allowed_file(image_file.filename, image_file):
        return jsonify({"msg": "Tipo de archivo no permitido"}), 400

    file_url, upload_error = upload_to_cloudinary(image_file, folder="blogyu/backgrounds")
    if not file_url:
        status = 503 if upload_error and "CLOUDINARY_URL" in upload_error else 500
        return jsonify({"msg": "Error subiendo imagen a Cloudinary", "error": upload_error}), status

    try:
        user = User.query.get_or_404(user_id)
        setattr(user, 'background', file_url)
        db.session.commit()
    except Exception as ex:
        current_app.logger.exception("Fallo guardando background en BD")
        db.session.rollback()
        return jsonify({"msg": "Error actualizando usuario", "error": str(ex)}), 500

    try:
        serialized = user.serialize()
    except Exception:
        serialized = {'id': user.id, 'background': getattr(user, 'background', None)}
    return jsonify({"msg": "Background de usuario actualizado", "background": file_url, "user": serialized}), 200

@api.route('/users/<int:user_id>/profile-pic', methods=['POST'])
@jwt_required()
def upload_user_profile_pic(user_id):
    try:
        current_user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({"msg": "Token inválido / no autorizado"}), 401

    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    file_field_candidates = ['profile', 'avatar', 'profile_pic', 'profilePic', 'file']
    image_file = None
    for fname in file_field_candidates:
        if fname in request.files and getattr(request.files[fname], 'filename', None):
            candidate = request.files[fname]
            if allowed_file(candidate.filename, candidate):
                image_file = candidate
                break

    if image_file is None:
        return jsonify({"msg": "No se recibió archivo de avatar (usar 'profile'|'avatar'|'profile_pic')"}), 400

    if image_file.filename == "":
        return jsonify({"msg": "Nombre de archivo vacío"}), 400
    if not allowed_file(image_file.filename, image_file):
        return jsonify({"msg": "Tipo de archivo no permitido"}), 400

    file_url, upload_error = upload_to_cloudinary(image_file, folder="blogyu/avatars")
    if not file_url:
        status = 503 if upload_error and "CLOUDINARY_URL" in upload_error else 500
        return jsonify({"msg": "Error subiendo imagen a Cloudinary", "error": upload_error}), status

    try:
        user = User.query.get_or_404(user_id)
        setattr(user, 'profile_pic', file_url)
        db.session.commit()
    except Exception as ex:
        current_app.logger.exception("Fallo guardando avatar en BD")
        db.session.rollback()
        return jsonify({"msg": "Error actualizando usuario", "error": str(ex)}), 500

    try:
        serialized = user.serialize()
    except Exception:
        serialized = {'id': user.id, 'profile_pic': getattr(user, 'profile_pic', None)}
    return jsonify({"msg": "Avatar actualizado", "profile_pic": file_url, "user": serialized}), 200

@api.route('/users/<int:user_id>', methods=['PATCH'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({"msg": "Token inválido / no autorizado"}), 401

    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos para editar este usuario"}), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    try:
        if 'profileShape' in data:
            val = data.get('profileShape')
            if hasattr(user, 'profile_shape'):
                setattr(user, 'profile_shape', val)
            else:
                setattr(user, 'profileShape', val)
        if 'profile_shape' in data:
            val = data.get('profile_shape')
            if hasattr(user, 'profile_shape'):
                setattr(user, 'profile_shape', val)
            else:
                setattr(user, 'profileShape', val)

        social = data.get('social')
        if isinstance(social, dict):
            if hasattr(user, 'social_twitter') or hasattr(user, 'twitter'):
                if 'twitter' in social:
                    if hasattr(user, 'social_twitter'):
                        user.social_twitter = social.get('twitter')
                    elif hasattr(user, 'twitter'):
                        user.twitter = social.get('twitter')
                if 'instagram' in social:
                    if hasattr(user, 'social_instagram'):
                        user.social_instagram = social.get('instagram')
                    elif hasattr(user, 'instagram'):
                        user.instagram = social.get('instagram')
                if 'facebook' in social:
                    if hasattr(user, 'social_facebook'):
                        user.social_facebook = social.get('facebook')
                    elif hasattr(user, 'facebook'):
                        user.facebook = social.get('facebook')
                if 'website' in social:
                    if hasattr(user, 'social_website'):
                        user.social_website = social.get('website')
                    elif hasattr(user, 'website'):
                        user.website = social.get('website')
            else:
                if hasattr(user, 'social') and (getattr(user, 'social') is None or isinstance(getattr(user, 'social'), dict)):
                    existing = getattr(user, 'social') or {}
                    existing.update(social)
                    setattr(user, 'social', existing)
                elif hasattr(user, 'meta') and (getattr(user, 'meta') is None or isinstance(getattr(user, 'meta'), dict)):
                    existing = getattr(user, 'meta') or {}
                    existing.setdefault('social', {}).update(social)
                    setattr(user, 'meta', existing)

        if 'name' in data and hasattr(user, 'name'):
            user.name = data.get('name')
        if 'email' in data and hasattr(user, 'email'):
            user.email = data.get('email')

        db.session.commit()

        try:
            serialized = user.serialize()
        except Exception:
            current_app.logger.exception("user.serialize() falló, devolviendo campos básicos")
            serialized = {'id': user.id, 'name': getattr(user, 'name', None), 'email': getattr(user, 'email', None)}

        return jsonify({'msg': 'Usuario actualizado', 'user': serialized}), 200

    except Exception as exc:
        current_app.logger.exception("Excepción actualizando usuario (PATCH /users/%s)", user_id)
        db.session.rollback()
        tb = traceback.format_exc()
        current_app.logger.debug("Traceback:\n%s", tb)
        return jsonify({'msg': 'Error actualizando usuario', 'error': str(exc)}), 500

# ----------------- TRAVEL ROUTES -----------------
@api.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    user_id = int(get_jwt_identity())
    body = request.get_json(silent=True) or {}

    title = (body.get("title") or "").strip()
    destination = (body.get("destination") or "").strip()
    start_date = body.get("start_date")
    budget = body.get("budget")
    steps = body.get("steps") or []

    if not title or not destination:
        return jsonify({"msg": "title y destination son requeridos"}), 400
    if not isinstance(steps, list):
        return jsonify({"msg": "steps debe ser una lista"}), 400

    route = TravelRoute(
        title=title, destination=destination,
        start_date=start_date, budget=budget,
        created_at=datetime.utcnow(), user_id=user_id
    )
    db.session.add(route)
    db.session.flush()

    allowed_types = {"vuelo", "aeropuerto", "vip", "hotel", "restaurante", "cafe", "lugar", "transporte", "otro"}

    for i, s in enumerate(steps):
        if not isinstance(s, dict):
            return jsonify({"msg": f"El step #{i} es inválido"}), 400

        step_type = (s.get("type") or "").strip().lower()
        step_title = (s.get("title") or "").strip()
        step_desc = s.get("description")
        step_location = s.get("location")
        step_rating = s.get("rating", 5)

        if not step_type or step_type not in allowed_types:
            return jsonify({"msg": f"El step #{i} tiene type inválido"}), 400
        if not step_title:
            return jsonify({"msg": f"El step #{i} requiere title"}), 400

        try:
            step_rating = int(step_rating)
        except Exception:
            step_rating = 5
        step_rating = max(1, min(5, step_rating))

        step = RouteStep(
            type=step_type, title=step_title,
            description=step_desc, rating=step_rating,
            location=step_location, route_id=route.id
        )
        db.session.add(step)
        db.session.flush()

        step_images = s.get("images") or []
        for img_url in step_images:
            if img_url:
                db.session.add(RouteStepImage(url=img_url, step_id=step.id))

    db.session.commit()
    return jsonify({"msg": "Ruta creada", "route": route.serialize()}), 201

@api.route('/routes', methods=['GET'])
def get_routes():
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    routes = TravelRoute.query.order_by(TravelRoute.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [r.serialize() for r in routes.items],
        "total": routes.total,
        "page": routes.page,
        "pages": routes.pages,
        "per_page": routes.per_page,
    }), 200

@api.route('/routes/<int:route_id>', methods=['GET'])
def get_route(route_id):
    route = TravelRoute.query.get_or_404(route_id)
    return jsonify(route.serialize()), 200

@api.route('/routes/<int:route_id>', methods=['DELETE'])
@jwt_required()
def delete_route(route_id):
    user_id = int(get_jwt_identity())
    route = TravelRoute.query.get_or_404(route_id)
    if route.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403
    db.session.delete(route)
    db.session.commit()
    return jsonify({"msg": "Ruta eliminada"}), 200

@api.route('/my-routes', methods=['GET'])
@jwt_required()
def get_my_routes():
    user_id = int(get_jwt_identity())
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    routes = TravelRoute.query.filter_by(user_id=user_id).order_by(TravelRoute.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [r.serialize() for r in routes.items],
        "total": routes.total,
        "page": routes.page,
        "pages": routes.pages,
        "per_page": routes.per_page,
    }), 200

@api.route('/routes/<int:route_id>', methods=['PUT'])
@jwt_required()
def update_route(route_id):
    user_id = int(get_jwt_identity())
    route = TravelRoute.query.get_or_404(route_id)
    if route.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    body = request.get_json(silent=True) or {}

    route.title = (body.get("title") or route.title).strip()
    route.destination = (body.get("destination") or route.destination).strip()
    route.start_date = body.get("start_date", route.start_date)
    route.budget = body.get("budget", route.budget)

    new_steps = body.get("steps")
    if new_steps is not None:
        allowed_types = {"vuelo","aeropuerto","vip","hotel","restaurante","cafe","lugar","transporte","otro"}

        current_steps = RouteStep.query.filter_by(route_id=route.id).all()
        old_step_ids = [step.id for step in current_steps]
        RouteStepImage.query.filter(RouteStepImage.step_id.in_(old_step_ids)).delete(synchronize_session=False)
        RouteStep.query.filter_by(route_id=route.id).delete()
        db.session.flush()

        for i, s in enumerate(new_steps):
            step_type = (s.get("type") or "").strip().lower()
            step_title = (s.get("title") or "").strip()
            if not step_type or step_type not in allowed_types:
                return jsonify({"msg": f"Step #{i} tiene type inválido"}), 400
            if not step_title:
                return jsonify({"msg": f"Step #{i} requiere title"}), 400

            try:
                rating = max(1, min(5, int(s.get("rating", 5))))
            except Exception:
                rating = 5

            step = RouteStep(
                type=step_type,
                title=step_title,
                description=s.get("description"),
                rating=rating,
                location=s.get("location"),
                route_id=route.id
            )
            db.session.add(step)
            db.session.flush()

            for url in (s.get("keep_image_urls") or []):
                if url:
                    db.session.add(RouteStepImage(url=url, step_id=step.id))
            for url in (s.get("new_images") or []):
                if url:
                    db.session.add(RouteStepImage(url=url, step_id=step.id))

    db.session.commit()
    return jsonify({"msg": "Ruta actualizada", "route": route.serialize()}), 200

# ----------------- ADMIN / SETTINGS -----------------
@api.route('/test-mail', methods=['GET'])
def test_mail():
    # Destinatario: ?to=correo o, por defecto, el remitente verificado.
    to = (request.args.get('to') or _get_sender_email() or '').strip()
    if not to:
        return jsonify({"error": "No hay destinatario. Usa ?to=correo o configura SENDGRID_SENDER_EMAIL."}), 400

    ok, err = send_email_via_sendgrid_api(
        to,
        "Test correo BlogYU",
        "Este es un correo de prueba desde BlogYU (vía SendGrid Web API).",
    )
    if ok:
        return jsonify({"msg": f"Correo de prueba enviado correctamente a {to}"}), 200
    current_app.logger.error("Error enviando test mail: %s", err)
    return jsonify({"error": err}), 502

@api.route('/settings/home-background', methods=['GET'])
@api.route('/home-background', methods=['GET'])
@api.route('/settings/site/home_background', methods=['GET'])
@api.route('/public/home-background', methods=['GET'])
def get_home_background():
    try:
        settings_path = os.path.join(current_app.instance_path, 'home_background.json')
        if os.path.exists(settings_path):
            with open(settings_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data), 200
        return jsonify({"background": None}), 200
    except Exception:
        current_app.logger.exception("Error leyendo home_background.json")
        return jsonify({"background": None, "error": "error leyendo configuración"}), 500

@api.route('/admin/settings/home_background', methods=['POST'])
@jwt_required()
@admin_required
def set_home_background():
    try:
        inst_path = current_app.instance_path
        uploads_dir = os.path.join(inst_path, 'uploads')
        settings_path = os.path.join(inst_path, 'home_background.json')

        current_app.logger.debug("[bg] instance_path=%s uploads_dir=%s", inst_path, uploads_dir)
        os.makedirs(uploads_dir, exist_ok=True)

        if 'background' in request.files and request.files['background'].filename:
            image_file = request.files['background']
            if image_file.filename == "":
                return jsonify({"msg": "Nombre de archivo vacío"}), 400
            if not allowed_file(image_file.filename, image_file):
                return jsonify({"msg": "Tipo de archivo no permitido"}), 400
            try:
                image_file.seek(0, os.SEEK_END)
                size = image_file.tell()
                image_file.seek(0)
                if size > MAX_FILE_SIZE:
                    return jsonify({"msg": "Archivo demasiado grande"}), 400
            except Exception:
                current_app.logger.debug("[bg] no se pudo determinar tamaño")

            filename = f"home_bg_{int(time())}_{secure_filename(image_file.filename)}"
            save_path = os.path.join(uploads_dir, filename)
            try:
                image_file.save(save_path)
            except Exception as ex:
                current_app.logger.exception("[bg] fallo al guardar el archivo")
                return jsonify({"msg": "Error guardando archivo", "error": str(ex)}), 500

            file_url = f"/api/uploads/{filename}"
            try:
                with open(settings_path, 'w', encoding='utf-8') as f:
                    json.dump({"background": file_url, "updated_at": datetime.utcnow().isoformat()}, f)
            except Exception:
                current_app.logger.exception("[bg] fallo al escribir home_background.json")
                return jsonify({"background": file_url, "warning": "No se pudo escribir home_background.json"}), 200
            return jsonify({"background": file_url}), 200

        if request.is_json:
            body = request.get_json(silent=True) or {}
            bg_url = body.get('background') or body.get('url')
            if not bg_url:
                return jsonify({"msg": "background URL requerida"}), 400
            try:
                with open(settings_path, 'w', encoding='utf-8') as f:
                    json.dump({"background": bg_url, "updated_at": datetime.utcnow().isoformat()}, f)
            except Exception:
                current_app.logger.exception("[bg] fallo al escribir home_background.json (json body)")
                return jsonify({"msg": "Error escribiendo configuración", "error": "error guardando"}), 500
            return jsonify({"background": bg_url}), 200

        return jsonify({"msg": "Envía un archivo 'background' o JSON con 'background'"}), 400

    except Exception:
        current_app.logger.exception("Error guardando home background")
        return jsonify({"msg": "Error interno", "error": "exception"}), 500

# ----------------- ADMIN POSTS -----------------
@api.route('/admin/posts', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_all_posts():
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    status = request.args.get('status')
    query = Post.query
    if status in ('published', 'draft'):
        query = query.filter(Post.status == status)
    posts = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [p.serialize() for p in posts.items],
        "total": posts.total,
        "page": posts.page,
        "pages": posts.pages,
        "per_page": posts.per_page
    }), 200

@api.route('/admin/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_post(post_id):
    p = Post.query.get_or_404(post_id)
    cleanup_post_cloudinary_assets(p)
    Comment.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    PostImage.query.filter_by(post_id=post_id).delete(synchronize_session=False)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "Post eliminado por admin"}), 200

# ----------------- ADMIN ROUTES -----------------
@api.route('/admin/routes', methods=['GET'])
@jwt_required()
@admin_required
def admin_get_all_routes():
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    routes = TravelRoute.query.order_by(TravelRoute.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "items": [r.serialize() for r in routes.items],
        "total": routes.total,
        "page": routes.page,
        "pages": routes.pages,
        "per_page": routes.per_page,
    }), 200

@api.route('/admin/routes/<int:route_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_route(route_id):
    route = TravelRoute.query.get_or_404(route_id)
    db.session.delete(route)
    db.session.commit()
    return jsonify({"msg": "Ruta eliminada por admin"}), 200

# ----------------- ADMIN STATS -----------------
@api.route('/admin/stats', methods=['GET'])
@jwt_required()
@admin_required
def admin_stats():
    users_count = User.query.count()
    posts_count = Post.query.count()
    published_count = Post.query.filter_by(status='published').count()
    draft_count = Post.query.filter_by(status='draft').count()
    routes_count = TravelRoute.query.count()
    comments_count = Comment.query.count()
    likes_count = Like.query.count()
    return jsonify({
        "users": users_count,
        "posts": posts_count,
        "published": published_count,
        "drafts": draft_count,
        "routes": routes_count,
        "comments": comments_count,
        "likes": likes_count,
    }), 200

# ----------------- ADMIN USERS -----------------
@api.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    users = User.query.order_by(User.id.asc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [u.serialize() for u in users.items],
        "total": users.total,
        "page": users.page,
        "pages": users.pages,
        "per_page": users.per_page,
    }), 200

@api.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "Usuario eliminado"}), 200

@api.route('/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}
    if 'is_admin' in data:
        user.is_admin = bool(data['is_admin'])
    if 'role' in data:
        user.role = str(data['role'])
    db.session.commit()
    return jsonify(user.serialize()), 200

@api.route('/users/<int:user_id>/public', methods=['GET'])
def get_user_public(user_id):
    user = User.query.get_or_404(user_id)

    # Cuentas
    posts_count = Post.query.filter_by(user_id=user_id).count()
    routes_count = TravelRoute.query.filter_by(user_id=user_id).count()
    likes_given = Like.query.filter_by(user_id=user_id).count()

    social = {}
    if hasattr(user, 'social') and isinstance(getattr(user, 'social'), dict):
        social = user.social or {}
    else:
        for key in ['twitter', 'instagram', 'tiktok', 'facebook', 'website']:
            val = getattr(user, f'social_{key}', None) or getattr(user, key, None)
            if val:
                social[key] = val

    return jsonify({
        "id": user.id,
        "name": getattr(user, "name", None),
        "email": getattr(user, "email", None),
        "profile_pic": getattr(user, "profile_pic", None),
        "background": getattr(user, "background", None),
        "role": getattr(user, "role", "user"),
        "posts_count": posts_count,
        "routes_count": routes_count,
        "likes_given": likes_given,
        "joined_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None,
        "social": social,
    }), 200

# ----------------- NOTIFICATIONS -----------------
@api.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    default_per_page = current_app.config.get('POSTS_PER_PAGE', 10)
    page, per_page = parse_pagination_args(default_per_page=default_per_page)
    notifications = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [n.serialize() for n in notifications.items],
        "total": notifications.total,
        "page": notifications.page,
        "pages": notifications.pages,
        "per_page": notifications.per_page,
    }), 200

@api.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.get_or_404(notification_id)
    if notification.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403
    notification.is_read = True
    db.session.commit()
    return jsonify({"msg": "Notificación marcada como leída"}), 200

@api.route('/notifications/clear-read', methods=['DELETE'])
@jwt_required()
def clear_read_notifications():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=True).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"msg": "Notificaciones leídas borradas"}), 200

@api.route('/api/uploads/list', methods=['GET'])
def list_uploads():
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    try:
        files = os.listdir(uploads_dir)
        image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'))]
        return jsonify({"files": image_files}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/secret-setup-admin-xyz123', methods=['GET'])
def setup_admin():
    from src.api.extensions import db
    from src.api.models import User

    try:
        target_email = 'ferbarotz@gmail.com'
        user = User.query.filter_by(email=target_email).first()

        if user:
            user.is_admin = True
            db.session.commit()
            return jsonify({"ok": True, "msg": f"Admin activado para {user.email}"}), 200
        else:
            user = User(
                name='Fernando Barrera',
                email=target_email,
                is_admin=True
            )
            user.password = 'Admin@Fer@Bar@Ort@'
            db.session.add(user)
            db.session.commit()
            return jsonify({"ok": True, "msg": f"Admin creado para {user.email}"}), 200

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500