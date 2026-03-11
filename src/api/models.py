# src/api/models.py
from .extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "is_active": self.is_active
        }

class Post(db.Model):
    __tablename__ = "post"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image = db.Column(db.String(512), nullable=True)   # guardaremos la URL pública o path relativo
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    author = db.relationship("User", backref=db.backref("posts", lazy=True))

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "image": self.image,
            "created_at": self.created_at.isoformat(),
            "user_id": self.user_id,
            "author": self.author.serialize() if self.author else None
        }