from .extensions import db
from datetime import datetime
import urllib.parse
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    background = db.Column(db.String(512), nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "is_active": self.is_active,
            "background": self.background
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
    images = db.relationship("PostImage", backref="post", cascade="all, delete-orphan", lazy=True)
    author = db.relationship("User", backref=db.backref("posts", lazy=True))

    def serialize(self):
        created = None
        try:
            created = self.created_at.isoformat() if self.created_at else None
        except Exception:
            created = None

        image_url = None
        raw = getattr(self, "image", None)
        if raw:
            try:
                parsed = urllib.parse.urlparse(raw)
                if parsed.scheme and parsed.netloc:
                    if "/api/uploads/" in parsed.path:
                        image_url = parsed.path
                    else:
                        image_url = parsed.path or raw
                else:
                    if raw.startswith("/"):
                        image_url = raw
                    else:
                        image_url = f"/api/uploads/{raw}" if "/" not in raw else raw
            except Exception:
                image_url = raw

        author = None
        if getattr(self, "author", None):
            u = self.author
            author = {
                "id": getattr(u, "id", None),
                "email": getattr(u, "email", None),
                "name": getattr(u, "name", None),
                "is_active": getattr(u, "is_active", None)
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
            "images": [img.serialize() for img in self.images]  # ← NUEVO
        }


class PostImage(db.Model):
    __tablename__ = "post_images"

    id      = db.Column(db.Integer, primary_key=True)
    url     = db.Column(db.String(500), nullable=False)
    order   = db.Column(db.Integer, default=0)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable=False)  # ← "post" no "posts"

    def serialize(self):
        return {
            "id":      self.id,
            "url":     self.url,
            "order":   self.order,
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
            "created_at": self.created_at.isoformat(),
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

    author = db.relationship("User", backref=db.backref("routes", lazy=True))
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
                "email": self.author.email
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
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    item_type = db.Column(db.String(50), nullable=False)  # 'post' | 'route' | ...
    item_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'item_type', 'item_id', name='uq_user_item_favorite'),
    )

    user = db.relationship("User", backref=db.backref("favorites", lazy="dynamic"))