from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from werkzeug.utils import secure_filename
import os
from time import time

from .extensions import db, bcrypt
from .models import User, Post

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)

api = Blueprint('api', __name__)

# Extensiones permitidas en servidor (añade más si lo necesitas)
ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB


def allowed_file(filename, file_obj=None):
    """
    1) Si hay extensión en filename, comprobarla contra ALLOWED_EXT.
    2) Si no, usar mimetype del file_obj como fallback.
    """
    if filename and '.' in filename:
        ext = filename.rsplit('.', 1)[1].lower()
        if ext in ALLOWED_EXT:
            return True

    if file_obj is not None:
        mimetype = getattr(file_obj, 'mimetype', '') or ''
        if mimetype.startswith('image/'):
            return True

    return False


# ---------- USERS ----------
@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([u.serialize() for u in users]), 200


@api.route('/users', methods=['POST'])
def create_user():
    body = request.get_json()
    if not body:
        return jsonify({"msg": "Datos vacíos"}), 400
    if not body.get('email') or not body.get('password') or not body.get('name'):
        return jsonify({"msg": "Faltan campos obligatorios (name, email, password)"}), 400
    if User.query.filter_by(email=body['email']).first():
        return jsonify({"msg": "El email ya está registrado"}), 400

    hashed_pwd = bcrypt.generate_password_hash(body['password']).decode('utf-8')
    new_user = User(name=body['name'], email=body['email'], password=hashed_pwd)
    db.session.add(new_user)
    db.session.commit()
    return jsonify(new_user.serialize()), 201


# ---------- LOGIN ----------
@api.route('/login', methods=['POST'])
def login():
    body = request.get_json()
    if not body:
        return jsonify({"msg": "Faltan datos"}), 400

    user = User.query.filter_by(email=body.get('email')).first()
    if user and bcrypt.check_password_hash(user.password, body.get('password')):
        token = create_access_token(identity=str(user.id))
        return jsonify({"token": token, "user": user.serialize()}), 200

    return jsonify({"msg": "Email o contraseña incorrectos"}), 401


# ---------- UPLOADS (servir archivos en desarrollo) ----------
@api.route('/uploads/<path:filename>', methods=['GET'])
def uploads(filename):
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    return send_from_directory(uploads_dir, filename)


# ---------- POSTS ----------
@api.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    title = request.form.get('title')
    content = request.form.get('content')

    if not title or not content:
        return jsonify({"msg": "Faltan campos obligatorios (title, content)"}), 400

    image_file = request.files.get('image')
    image_url = None

    if image_file and image_file.filename != "":
        # DEBUG: ver filename y mimetype en la terminal de Flask
        print("UPLOAD:", image_file.filename, image_file.mimetype)

        if not allowed_file(image_file.filename, image_file):
            return jsonify({"msg": "Tipo de archivo no permitido"}), 400

        # verificar tamaño
        image_file.seek(0, os.SEEK_END)
        size = image_file.tell()
        image_file.seek(0)
        if size > MAX_FILE_SIZE:
            return jsonify({"msg": f"El archivo supera el límite de {MAX_FILE_SIZE} bytes"}), 400

        filename = secure_filename(image_file.filename)
        uploads_dir = os.path.join(current_app.instance_path, 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)

        # evitar colisiones añadiendo timestamp
        filename = f"{int(time())}_{filename}"

        save_path = os.path.join(uploads_dir, filename)
        image_file.save(save_path)

        # URL pública (dev) -> queda como /api/uploads/<filename>
        try:
            image_url = url_for('api.uploads', filename=filename, _external=True)
        except Exception:
            image_url = f"/uploads/{filename}"

    # Guardar en la BD usando el modelo Post
    new_post = Post(title=title, content=content, image=image_url, user_id=int(user_id))
    db.session.add(new_post)
    db.session.commit()

    return jsonify({"msg": "Post creado", "post": new_post.serialize()}), 201


@api.route('/posts', methods=['GET'])
def get_all_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify([p.serialize() for p in posts]), 200


# Obtener posts del usuario autenticado
@api.route('/my-posts', methods=['GET'])
@jwt_required()
def get_user_posts():
    user_id = get_jwt_identity()
    posts = Post.query.filter_by(user_id=int(user_id)).order_by(Post.created_at.desc()).all()
    return jsonify([p.serialize() for p in posts]), 200


# Obtener un post por id (público)
@api.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    post = Post.query.get_or_404(post_id)
    return jsonify(post.serialize()), 200


# Actualizar un post (solo autor)
@api.route('/posts/<int:post_id>', methods=['PUT'])
@jwt_required()
def update_post(post_id):
    user_id = int(get_jwt_identity())
    post = Post.query.get_or_404(post_id)
    if post.user_id != user_id:
        return jsonify({"msg": "No autorizado"}), 403

    # Si recibimos multipart/form-data (posible imagen), usar request.form y request.files
    title = request.form.get('title') or (request.json and request.json.get('title'))
    content = request.form.get('content') or (request.json and request.json.get('content'))

    if title:
        post.title = title
    if content:
        post.content = content

    image_file = request.files.get('image')
    if image_file and image_file.filename != "":
        # validar como en create_post
        if not allowed_file(image_file.filename, image_file):
            return jsonify({"msg": "Tipo de archivo no permitido"}), 400

        # eliminar imagen vieja si existe (opcional)
        if post.image:
            try:
                old_filename = os.path.basename(post.image)
                old_path = os.path.join(current_app.instance_path, 'uploads', old_filename)
                if os.path.exists(old_path):
                    os.remove(old_path)
            except Exception:
                pass

        filename = secure_filename(image_file.filename)
        filename = f"{int(time())}_{filename}"
        uploads_dir = os.path.join(current_app.instance_path, 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        save_path = os.path.join(uploads_dir, filename)
        image_file.save(save_path)
        try:
            post.image = url_for('api.uploads', filename=filename, _external=True)
        except Exception:
            post.image = f"/uploads/{filename}"

    db.session.commit()
    return jsonify({"msg": "Post actualizado", "post": post.serialize()}), 200


# Borrar un post (solo autor)
@api.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    post = Post.query.get_or_404(post_id)
    if post.user_id != user_id:
        return jsonify({"msg": "No autorizado"}), 403

    # eliminar imagen del disco si existe
    if post.image:
        try:
            filename = os.path.basename(post.image)
            path = os.path.join(current_app.instance_path, 'uploads', filename)
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass

    db.session.delete(post)
    db.session.commit()
    return jsonify({"msg": "Post eliminado"}), 200