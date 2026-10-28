# src/api/models.py
from .extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import bcrypt


class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    password_hash = db.Column('password', db.String(256), nullable=False)

    is_active = db.Column(db.Boolean, default=True)
    background = db.Column(db.String(512), nullable=True)
    profile_pic = db.Column(db.String(512), nullable=True)
    is_admin = db.Column(db.Boolean, default=False)
    location = db.Column(db.String(200), nullable=True)
    role = db.Column(db.String(50), default="user")  # user | moderator | editor | admin

    # Relaciones con cascada — al borrar User se borran sus posts, rutas y favoritos
    posts = db.relationship("Post", back_populates="author", cascade="all, delete-orphan", lazy=True)
    routes = db.relationship("TravelRoute", back_populates="author", cascade="all, delete-orphan", lazy=True)
    favorites = db.relationship("Favorite", backref=db.backref("user_fav", lazy=True), cascade="all, delete-orphan", lazy="dynamic")
    likes = db.relationship("Like", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    notifications = db.relationship("Notification", backref="user", cascade="all, delete-orphan", lazy="dynamic")

    @property
    def password(self):
        raise AttributeError("La contraseña no es legible.")

    @password.setter
    def password(self, plain_password: str):
        if plain_password is None:
            self.password_hash = None
        else:
            self.password_hash = generate_password_hash(plain_password)

    def check_password(self, plain_password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, plain_password)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "is_active": self.is_active,
            "background": self.background,
            "is_admin": self.is_admin,
            "role": self.role,
            "profile_pic": self.profile_pic,
            "location": self.location,
        }


class Post(db.Model):
    __tablename__ = "post"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image = db.Column(db.String(512), nullable=True)
    category = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), default="published")  # draft | published
    views = db.Column(db.Integer, default=0)  # contador de vistas

    images = db.relationship("PostImage", backref="post", cascade="all, delete-orphan", lazy=True)
    # back_populates en vez de backref para evitar conflicto con User.posts
    author = db.relationship("User", back_populates="posts")
    likes = db.relationship("Like", backref=db.backref("post", uselist=False), cascade="all, delete-orphan", lazy="dynamic")

    def serialize(self):
        created = None
        try:
            created = self.created_at.isoformat() if self.created_at else None
        except Exception:
            created = None

        # La imagen viene de Cloudinary ya formateada; si es una URL completa la usamos tal cual.
        image_url = self.image if self.image else None

        author = None
        if self.author:
            u = self.author
            author = {
                "id": u.id,
                "name": getattr(u, "name", None),
                "is_active": getattr(u, "is_active", None),
                "profile_pic": getattr(u, "profile_pic", None),
            }

        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "user_id": self.user_id,
            "created_at": created,
            "image": image_url,
            "category": self.category,
            "author": author,
            "images": [img.serialize() for img in self.images],
            "status": self.status,
        }


class PostImage(db.Model):
    __tablename__ = "post_images"
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    order = db.Column(db.Integer, default=0)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "url": self.url,
            "order": self.order,
            "post_id": self.post_id
        }


class Comment(db.Model):
    __tablename__ = "comment"
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "content": self.content,
            "author_name": self.author_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "post_id": self.post_id,
            "user_id": self.user_id
        }


class TravelRoute(db.Model):
    __tablename__ = "travel_route"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.String(50))
    budget = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # back_populates en vez de backref para evitar conflicto con User.routes
    author = db.relationship("User", back_populates="routes")
    steps = db.relationship(
        "RouteStep",
        backref="route",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def serialize(self):
        author = None
        if self.author:
            author = {
                "id": self.author.id,
                "name": self.author.name,
                "profile_pic": getattr(self.author, "profile_pic", None),
            }
        return {
            "id": self.id,
            "title": self.title,
            "destination": self.destination,
            "start_date": self.start_date,
            "budget": self.budget,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_id": self.user_id,
            "author": author,
            "steps": [s.serialize() for s in self.steps]
        }


class RouteStep(db.Model):
    __tablename__ = "route_step"
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    rating = db.Column(db.Integer, default=5)
    location = db.Column(db.String(200))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    route_id = db.Column(db.Integer, db.ForeignKey("travel_route.id"), nullable=False)

    images = db.relationship(
        "RouteStepImage",
        backref="step",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "description": self.description,
            "rating": self.rating,
            "location": self.location,
            "lat": self.lat,
            "lng": self.lng,
            "route_id": self.route_id,
            "images": [img.serialize() for img in self.images]
        }


class RouteStepImage(db.Model):
    __tablename__ = "route_step_image"
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(512), nullable=False)
    step_id = db.Column(db.Integer, db.ForeignKey("route_step.id"), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "url": self.url
        }


class Favorite(db.Model):
    __tablename__ = "favorites"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    item_type = db.Column(db.String(50), nullable=False)
    item_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'item_type', 'item_id', name='uq_user_item_favorite'),
    )


class Like(db.Model):
    """Reacción/like visible en posts."""
    __tablename__ = "likes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='uq_user_post_like'),
    )


class Notification(db.Model):
    """Notificaciones para los usuarios (comentarios, likes, etc.)."""
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # "comment", "like", "follow"
    related_id = db.Column(db.Integer, nullable=False)  # ID del post, comentario, usuario
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "type": self.type,
            "related_id": self.related_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TokenBlocklist(db.Model):
    """Tokens JWT invalidados al hacer logout."""
    __tablename__ = "token_blocklist"
    id         = db.Column(db.Integer, primary_key=True)
    jti        = db.Column(db.String(36), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)