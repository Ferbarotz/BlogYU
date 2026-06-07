# src/api/routes.py
import os
import json
import traceback
from time import time
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import (create_access_token, jwt_required, get_jwt_identity, decode_token)
from flask_mail import Message

from .extensions import db, bcrypt, mail
from .models import User, Post, Comment, TravelRoute, RouteStep, RouteStepImage, PostImage

# Blueprint
api = bp = Blueprint('api', __name__)

# Config
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'}
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB default

# ----------------- Helpers -----------------
def allowed_file(filename, file_obj=None):
    """Check extension or mimetype fallback."""
    if filename and '.' in filename:
        ext = filename.rsplit('.', 1)[1].lower().strip()
        if ext in ALLOWED_EXT:
            return True
    if file_obj is not None:
        mimetype = getattr(file_obj, 'mimetype', '') or ''
        if mimetype.startswith('image/'):
            return True
    return False

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

# ----------------- AUTH -----------------
@api.route('/login', methods=['POST'])
def login():
    body = request.get_json(silent=True) or {}
    email = body.get('email')
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

    # Aseguramos que serialize() incluya profile_pic y background aunque el método custom no lo devuelva
    if "profile_pic" not in serialized:
        serialized["profile_pic"] = getattr(user, "profile_pic", None)
    if "background" not in serialized:
        serialized["background"] = getattr(user, "background", None)

    return jsonify({"token": token, "user": serialized}), 200

@api.route('/register', methods=['POST'])
def register():
    body = request.get_json(silent=True) or {}
    name = body.get('name')
    email = body.get('email')
    password = body.get('password')
    if not email or not password:
        return jsonify({"msg": "Email y password requeridos"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "El usuario ya existe"}), 400

    new_user = User(name=name, email=email)
    new_user.password = password  # asume que el setter del modelo hashea
    db.session.add(new_user)
    db.session.commit()
    try:
        user_serialized = new_user.serialize()
    except Exception:
        user_serialized = {"id": new_user.id, "name": new_user.name, "email": new_user.email}
    return jsonify({"msg": "Usuario creado con éxito", "user": user_serialized}), 201

# ----------------- PASSWORD RECOVERY -----------------
@api.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = (request.get_json(silent=True) or {}).get('email') or request.form.get('email')
    if not email:
        return jsonify({"msg": "Email requerido"}), 400

    user = User.query.filter_by(email=email).first()
    # No revelar si existe o no
    if not user:
        return jsonify({"msg": "Si el email existe, se ha enviado un link de recuperación"}), 200

    expires = timedelta(minutes=30)
    token = create_access_token(identity=user.id, expires_delta=expires)

    FRONTEND_URL = current_app.config.get('FRONTEND_URL') or os.environ.get('FRONTEND_URL') or 'http://localhost:3000'
    reset_url = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={token}"

    try:
        msg = Message(
            subject="Recuperación de contraseña - BlogYU",
            recipients=[email],
            body=f"Para restablecer tu contraseña haz clic en el siguiente enlace:\n\n{reset_url}\n\nEste enlace expirará en 30 minutos."
        )
        mail.send(msg)
    except Exception as e:
        current_app.logger.exception("Error enviando correo de recuperación")
        return jsonify({"msg": "Error al enviar el correo de recuperación", "error": str(e)}), 500

    return jsonify({"msg": "Si el email existe, se ha enviado un link de recuperación"}), 200

@api.route('/reset-password', methods=['POST'])
@api.route('/reset-password/<token>', methods=['POST'])
def reset_password(token=None):
    if not token:
        token = request.args.get('token') or (request.get_json(silent=True) or {}).get('token')
    if not token:
        return jsonify({"msg": "Token requerido"}), 400

    try:
        data = decode_token(token)
        user_id = data.get('sub') or data.get('identity') or data.get('identity')
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

    filename = secure_filename(file.filename)
    filename = f"step_{int(time())}_{filename}"
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    save_path = os.path.join(uploads_dir, filename)
    try:
        file.save(save_path)
        current_app.logger.info(f"Imagen subida y guardada: {save_path}")
    except Exception as ex:
        current_app.logger.exception("Error guardando archivo")
        return jsonify({"msg": "Error guardando archivo", "error": str(ex)}), 500

    file_url = f"/api/uploads/{filename}"
    current_app.logger.info(f"URL devuelta para imagen: {file_url}")
    return jsonify({"url": file_url}), 200

@api.route('/posts', methods=['GET'])
def get_all_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify([p.serialize() for p in posts]), 200

@api.route('/my-posts', methods=['GET'])
@jwt_required()
def get_user_posts():
    user_id = get_jwt_identity()
    posts = Post.query.filter_by(user_id=int(user_id)).order_by(Post.created_at.desc()).all()
    return jsonify([p.serialize() for p in posts]), 200

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
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        category = data.get('category')
        saved_urls = data.get('images', [])
    else:
        title = request.form.get('title')
        content = request.form.get('content')
        category = request.form.get('category')
        uploads_dir = os.path.join(current_app.instance_path, 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        for i, image_file in enumerate(request.files.getlist('images')):
            if not image_file or image_file.filename == "":
                continue
            if not allowed_file(image_file.filename, image_file):
                continue
            filename = f"{int(time())}_{i}_{secure_filename(image_file.filename)}"
            image_file.save(os.path.join(uploads_dir, filename))
            saved_urls.append(f"/api/uploads/{filename}")

    if not title or not content:
        return jsonify({"msg": "title and content required"}), 400

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

@api.route('/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def update_post(post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.get_or_404(post_id)
    if p.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403

    if request.is_json:
        data = request.get_json()
        p.title = data.get("title", p.title)
        p.content = data.get("content", p.content)
        p.category = data.get("category", p.category)

        # IDs de imágenes existentes que el usuario quiere CONSERVAR
        keep_ids = data.get("keep_image_ids", [])
        if keep_ids is not None:
            # Eliminar las imágenes que NO están en keep_ids
            for img in list(p.images):
                if img.id not in keep_ids:
                    try:
                        old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(img.url))
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    except Exception:
                        pass
                    db.session.delete(img)

        # Agregar nuevas URLs de imágenes
        new_image_urls = data.get("new_images", [])
        current_count = PostImage.query.filter_by(post_id=p.id).count()
        for i, url in enumerate(new_image_urls):
            db.session.add(PostImage(url=url, order=current_count + i, post_id=p.id))

        # Actualizar imagen principal (primera imagen que quede)
        db.session.flush()
        first_img = PostImage.query.filter_by(post_id=p.id).order_by(PostImage.order.asc()).first()
        p.image = first_img.url if first_img else None

    else:
        # multipart/form-data
        p.title = request.form.get("title") or p.title
        p.content = request.form.get("content") or p.content
        p.category = request.form.get("category") or p.category

        # IDs a conservar (vienen como JSON string en el form)
        keep_ids_raw = request.form.get("keep_image_ids")
        if keep_ids_raw:
            try:
                keep_ids = json.loads(keep_ids_raw)
            except Exception:
                keep_ids = []

            for img in list(p.images):
                if img.id not in keep_ids:
                    try:
                        old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(img.url))
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    except Exception:
                        pass
                    db.session.delete(img)

        # Subir nuevas fotos
        new_files = [f for f in request.files.getlist('images') if f and f.filename != ""]
        if new_files:
            uploads_dir = os.path.join(current_app.instance_path, 'uploads')
            os.makedirs(uploads_dir, exist_ok=True)
            current_count = PostImage.query.filter_by(post_id=p.id).count()
            for i, image_file in enumerate(new_files):
                if not allowed_file(image_file.filename, image_file):
                    continue
                filename = f"{int(time())}_{i}_{secure_filename(image_file.filename)}"
                image_file.save(os.path.join(uploads_dir, filename))
                url = f"/api/uploads/{filename}"
                db.session.add(PostImage(url=url, order=current_count + i, post_id=p.id))

        # Actualizar imagen principal
        db.session.flush()
        first_img = PostImage.query.filter_by(post_id=p.id).order_by(PostImage.order.asc()).first()
        p.image = first_img.url if first_img else p.image

    db.session.commit()
    return jsonify(p.serialize()), 200

@api.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.get_or_404(post_id)
    if p.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403
    for img in p.images:
        try:
            old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(img.url))
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            current_app.logger.exception("Error eliminando archivo imagen")
    if p.image:
        try:
            old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(p.image))
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            current_app.logger.exception("Error eliminando imagen principal")
    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "Eliminado"}), 200

# ----------------- CATEGORIES -----------------
@api.route('/categories', methods=['GET'])
def get_categories():
    categories = [
        {"id": "hoteles",      "name": "Hoteles"},
        {"id": "restaurantes", "name": "Restaurantes"},
        {"id": "bares",        "name": "Bares"},
        {"id": "lugares",      "name": "Lugares / Sitios"},
        {"id": "cultura",      "name": "Cultura / Museos"},
        {"id": "otros",        "name": "Otros"}
    ]
    return jsonify(categories), 200

# ----------------- COMMENTS -----------------
@api.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    return jsonify([c.serialize() for c in comments]), 200

@api.route('/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    body = request.get_json(silent=True) or {}
    new_comment = Comment(
        content=body.get("content"),
        author_name=body.get("author_name", "Invitado"),
        post_id=post_id,
        user_id=body.get("user_id")
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.serialize()), 201

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

# --- subir fondo (background) del usuario/profile page ---
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

    filename = f"background_{int(time())}_{secure_filename(image_file.filename)}"
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    save_path = os.path.join(uploads_dir, filename)
    try:
        image_file.save(save_path)
    except Exception as ex:
        current_app.logger.exception("Fallo guardando background")
        return jsonify({"msg": "Error guardando archivo", "error": str(ex)}), 500

    file_url = f"/api/uploads/{filename}"

    # SOLO actualizamos user.background
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

    # aceptamos varios nombres pero SOLO actualizamos profile_pic
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

    # Guardar archivo
    filename = f"profile_{int(time())}_{secure_filename(image_file.filename)}"
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    save_path = os.path.join(uploads_dir, filename)
    try:
        image_file.save(save_path)
    except Exception as ex:
        current_app.logger.exception("Fallo guardando avatar")
        return jsonify({"msg": "Error guardando archivo", "error": str(ex)}), 500

    file_url = f"/api/uploads/{filename}"

    # Solo actualizamos profile_pic en el usuario
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
    """
    PATCH seguro para /api/users/<id>
    Acepta JSON con: profileShape | profile_shape, social (obj), name, email
    """
    try:
        current_user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({"msg": "Token inválido / no autorizado"}), 401

    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos para editar este usuario"}), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    try:
        # profileShape / profile_shape
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

        # social merge
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

        # other safe fields
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
    routes = TravelRoute.query.order_by(TravelRoute.created_at.desc()).all()
    return jsonify([r.serialize() for r in routes]), 200

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
    routes = TravelRoute.query.filter_by(user_id=user_id).order_by(TravelRoute.created_at.desc()).all()
    return jsonify([r.serialize() for r in routes]), 200

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

        # Obtener pasos actuales de la ruta
        current_steps = RouteStep.query.filter_by(route_id=route.id).all()
        current_steps_map = {step.id: step for step in current_steps}

        # Para identificar qué pasos conservar y cuáles eliminar
        # Asumimos que los pasos nuevos no tienen id, así que eliminamos todos los pasos antiguos y creamos nuevos
        # Si quieres manejar edición de pasos con IDs, habría que modificar el frontend para enviar IDs

        # Por simplicidad, eliminamos pasos e imágenes que no estén en el nuevo payload
        # Primero, eliminamos todos los pasos e imágenes antiguos
        old_step_ids = [step.id for step in current_steps]
        RouteStepImage.query.filter(RouteStepImage.step_id.in_(old_step_ids)).delete(synchronize_session=False)
        RouteStep.query.filter_by(route_id=route.id).delete()
        db.session.flush()

        # Ahora creamos los pasos nuevos con sus imágenes
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

            keep_urls = s.get("keep_image_urls") or []
            new_urls = s.get("new_images") or []

            for url in keep_urls:
                if url:
                    db.session.add(RouteStepImage(url=url, step_id=step.id))

            for url in new_urls:
                if url:
                    db.session.add(RouteStepImage(url=url, step_id=step.id))

    db.session.commit()
    return jsonify({"msg": "Ruta actualizada", "route": route.serialize()}), 200

# ----------------- ADMIN / SETTINGS -----------------
@api.route('/test-mail', methods=['GET'])
def test_mail():
    try:
        msg = Message(
            subject="Test correo BlogYU",
            recipients=[current_app.config.get('MAIL_USERNAME')],
            body="Este es un correo de prueba desde BlogYU."
        )
        mail.send(msg)
        return jsonify({"msg": "Correo enviado correctamente"}), 200
    except Exception as e:
        current_app.logger.exception("Error enviando test mail")
        return jsonify({"error": str(e)}), 500

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

        # file upload
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

        # json url
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
    
# ----------------- ADMIN USERS -----------------  
@api.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify([u.serialize() for u in users]), 200


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
    db.session.commit()
    return jsonify(user.serialize()), 200



@api.route('/users/<int:user_id>/public', methods=['GET'])
def get_user_public(user_id):
    user = User.query.get_or_404(user_id)

    # Construir social desde columnas separadas o campo JSON
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
        "profile_pic": getattr(user, "profile_pic", None),
        "background": getattr(user, "background", None),
        "profileShape": getattr(user, "profile_shape", None) or getattr(user, "profileShape", None),
        "social": social,
    }), 200

  

import os
from flask import current_app, jsonify

@api.route('/api/uploads/list', methods=['GET'])
def list_uploads():
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    try:
        files = os.listdir(uploads_dir)
        image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.heic', '.avif'))]
        return jsonify({"files": image_files}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api.route('/secret-setup-admin-xyz123', methods=['GET'])
def setup_admin():
    """Ruta temporal para crear admin - BORRAR DESPUÉS"""
    from src.api.extensions import db
    from src.api.models import User
    
    try:
        user = User.query.filter_by(email='ferbarotz@gmail.com').first()
        if user:
            user.is_admin = True
            db.session.commit()
            return jsonify({"ok": True, "msg": f"Admin activado para {user.email}"}), 200
        else:
            # Crear usuario admin nuevo
            user = User(username='Fernando', email='ferbarotz@gmail.com', is_admin=True)
            user.set_password('TU_CONTRASEÑA_AQUI')
            db.session.add(user)
            db.session.commit()
            return jsonify({"ok": True, "msg": "Admin creado"}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500