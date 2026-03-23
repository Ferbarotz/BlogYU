from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
import os
from time import time
from datetime import datetime
from .extensions import db, bcrypt
from .models import User, Post, Comment, TravelRoute, RouteStep, RouteStepImage, PostImage
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

api = Blueprint('api', __name__)

ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'}
MAX_FILE_SIZE = 8 * 1024 * 1024

def allowed_file(filename, file_obj=None):
    if filename and '.' in filename:
        ext = filename.rsplit('.', 1)[1].lower().strip()
        if ext in ALLOWED_EXT:
            return True

    if file_obj is not None:
        mimetype = getattr(file_obj, 'mimetype', '') or ''
        if mimetype.startswith('image/'):
            return True

    return False


@api.route("/", methods=["GET"])
def api_root():
    return jsonify({"msg": "API BlogYU funcionando"}), 200


# ---------- AUTH ----------
@api.route('/login', methods=['POST'])
def login():
    body = request.get_json() or {}
    email = body.get('email')
    password = body.get('password')
    if not email or not password:
        return jsonify({"msg": "email y password requeridos"}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"msg": "Credenciales inválidas"}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.serialize()}), 200


@api.route('/register', methods=['POST'])
def register():
    body = request.get_json() or {}
    name = body.get('name')
    email = body.get('email')
    password = body.get('password')
    if not email or not password:
        return jsonify({"msg": "Email y password requeridos"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "El usuario ya existe"}), 400
    new_user = User(
        name=name,
        email=email,
        password=bcrypt.generate_password_hash(password).decode('utf-8')
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "Usuario creado con éxito"}), 201


# ---------- UPLOADS ----------
@api.route('/uploads/<path:filename>', methods=['GET'])
def uploads(filename):
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    return send_from_directory(uploads_dir, filename)


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
    file.save(os.path.join(uploads_dir, filename))

    file_url = f"/api/uploads/{filename}"
    return jsonify({"url": file_url}), 200


# ---------- POSTS ----------
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
    category = None
    saved_urls = []

    if request.is_json:
        data = request.get_json()
        title      = data.get('title')
        content    = data.get('content')
        category   = data.get('category')
        saved_urls = data.get('images', [])
    else:
        title    = request.form.get('title')
        content  = request.form.get('content')
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
        p.title    = data.get("title",    p.title)
        p.content  = data.get("content",  p.content)
        p.category = data.get("category", p.category)
    else:
        p.title    = request.form.get("title")    or p.title
        p.content  = request.form.get("content")  or p.content
        p.category = request.form.get("category") or p.category

        new_files = request.files.getlist('images')
        new_files = [f for f in new_files if f and f.filename != ""]

        if new_files:
            # Borrar imágenes viejas del disco
            for img in p.images:
                try:
                    old_path = os.path.join(
                        current_app.instance_path, 'uploads',
                        os.path.basename(img.url)
                    )
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except Exception:
                    pass

            # Borrar registros viejos de BD
            PostImage.query.filter_by(post_id=p.id).delete()

            uploads_dir = os.path.join(current_app.instance_path, 'uploads')
            os.makedirs(uploads_dir, exist_ok=True)
            saved_urls = []

            for i, image_file in enumerate(new_files):
                if not allowed_file(image_file.filename, image_file):
                    continue
                filename = f"{int(time())}_{i}_{secure_filename(image_file.filename)}"
                image_file.save(os.path.join(uploads_dir, filename))
                saved_urls.append(f"/api/uploads/{filename}")

            p.image = saved_urls[0] if saved_urls else p.image
            for order, url in enumerate(saved_urls):
                db.session.add(PostImage(url=url, order=order, post_id=p.id))

    db.session.commit()
    return jsonify(p.serialize()), 200


@api.route('/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.get_or_404(post_id)
    if p.user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403
    # Borrar imágenes del disco
    for img in p.images:
        try:
            old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(img.url))
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            pass
    if p.image:
        try:
            old_path = os.path.join(current_app.instance_path, 'uploads', os.path.basename(p.image))
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            pass
    db.session.delete(p)
    db.session.commit()
    return jsonify({"msg": "Eliminado"}), 200


# ---------- CATEGORIES ----------
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


# ---------- COMMENTS ----------
@api.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()
    return jsonify([c.serialize() for c in comments]), 200


@api.route('/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    body = request.get_json()
    new_comment = Comment(
        content=body.get("content"),
        author_name=body.get("author_name", "Invitado"),
        post_id=post_id,
        user_id=body.get("user_id")
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify(new_comment.serialize()), 201


# ---------- USERS ----------
@api.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "email": u.email, "name": u.name} for u in users]), 200


@api.route('/users/<int:user_id>/background', methods=['POST'])
@jwt_required()
def upload_user_background(user_id):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        return jsonify({"msg": "No tienes permisos"}), 403
    if 'background' not in request.files:
        return jsonify({"msg": "No se encontró el archivo 'background'"}), 400
    image_file = request.files['background']
    if image_file.filename == "":
        return jsonify({"msg": "Nombre de archivo vacío"}), 400
    if not allowed_file(image_file.filename, image_file):
        return jsonify({"msg": "Tipo de archivo no permitido"}), 400
    filename = f"{int(time())}_{secure_filename(image_file.filename)}"
    uploads_dir = os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    image_file.save(os.path.join(uploads_dir, filename))
    file_url = f"/api/uploads/{filename}"
    user = User.query.get_or_404(user_id)
    user.background = file_url
    db.session.commit()
    return jsonify({"msg": "Background actualizado", "background": file_url, "user": user.serialize()}), 200


# ---------- TRAVEL ROUTES ----------
@api.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    user_id = int(get_jwt_identity())
    body = request.get_json() or {}

    title       = (body.get("title")       or "").strip()
    destination = (body.get("destination") or "").strip()
    start_date  = body.get("start_date")
    budget      = body.get("budget")
    steps       = body.get("steps") or []

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

        step_type     = (s.get("type")  or "").strip().lower()
        step_title    = (s.get("title") or "").strip()
        step_desc     = s.get("description")
        step_location = s.get("location")
        step_rating   = s.get("rating", 5)

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

    body = request.get_json() or {}

    route.title       = (body.get("title")       or route.title).strip()
    route.destination = (body.get("destination") or route.destination).strip()
    route.start_date  = body.get("start_date",  route.start_date)
    route.budget      = body.get("budget",       route.budget)

    new_steps = body.get("steps")
    if new_steps is not None:
        # Borrar steps viejos (cascade borra sus imágenes también)
        RouteStep.query.filter_by(route_id=route.id).delete()
        db.session.flush()

        allowed_types = {"vuelo","aeropuerto","vip","hotel","restaurante",
                         "cafe","lugar","transporte","otro"}

        for i, s in enumerate(new_steps):
            step_type  = (s.get("type")  or "").strip().lower()
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

            for img_url in (s.get("images") or []):
                if img_url:
                    db.session.add(RouteStepImage(url=img_url, step_id=step.id))

    db.session.commit()
    return jsonify({"msg": "Ruta actualizada", "route": route.serialize()}), 200