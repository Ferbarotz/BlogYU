import os
from datetime import datetime

os.environ.setdefault("FLASK_DEBUG", "1")
os.environ.setdefault("DATABASE_URL", "sqlite:////home/ubuntu/BlogYU/instance/test_review_19_28.db")
os.environ.setdefault("SECRET_KEY", "dev-local-secret")
os.environ.setdefault("JWT_SECRET_KEY", "dev-local-jwt-secret")
os.environ.setdefault("SENDGRID_API_KEY", "SG.test")
os.environ.setdefault("SENDGRID_SENDER_EMAIL", "noreply@example.com")
os.environ.setdefault("CLOUDINARY_URL", "cloudinary://123456:abcdef@demo")

from src.api import create_app
from src.api.extensions import db
from src.api.models import User, Post, Comment, Notification, Like
from flask_jwt_extended import create_access_token


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def make_user(name, email, role="user", is_admin=False):
    u = User(name=name, email=email, role=role, is_admin=is_admin, is_active=True, created_at=datetime.utcnow())
    u.password = "password123"
    db.session.add(u)
    db.session.commit()
    return u


def run():
    app = create_app()

    with app.app_context():
        # clean tables for deterministic run
        Notification.query.delete()
        Like.query.delete()
        Comment.query.delete()
        Post.query.delete()
        User.query.delete()
        db.session.commit()

        admin = make_user("Admin", "admin@example.com", role="admin", is_admin=True)
        author = make_user("Autor", "author@example.com")
        viewer = make_user("Viewer", "viewer@example.com")
        editor = make_user("Editor", "editor@example.com", role="editor")
        moderator = make_user("Mod", "mod@example.com", role="moderator")

        admin_t = create_access_token(identity=str(admin.id))
        author_t = create_access_token(identity=str(author.id))
        viewer_t = create_access_token(identity=str(viewer.id))
        editor_t = create_access_token(identity=str(editor.id))
        moderator_t = create_access_token(identity=str(moderator.id))

    c = app.test_client()

    # 1) Draft + published
    r = c.post("/api/posts", json={"title": "Post Borrador", "content": "Contenido privado", "category": "otros", "status": "draft"}, headers=auth_header(author_t))
    assert r.status_code == 201, r.get_data(as_text=True)
    draft_id = r.get_json()["id"]

    r = c.post("/api/posts", json={"title": "Guía de Madrid", "content": "Museos y tapas en Madrid", "category": "cultura", "status": "published"}, headers=auth_header(author_t))
    assert r.status_code == 201, r.get_data(as_text=True)
    post_id = r.get_json()["id"]

    r = c.get("/api/posts")
    data = r.get_json()
    assert r.status_code == 200
    assert all(item["status"] == "published" for item in data["items"])
    assert all(item["id"] != draft_id for item in data["items"])

    # 2) Search
    r = c.get("/api/posts?q=madrid")
    assert r.status_code == 200
    ids = [p["id"] for p in r.get_json()["items"]]
    assert post_id in ids

    # 3) Public profile hides drafts
    r = c.get(f"/api/users/{author.id}/public")
    assert r.status_code == 200
    pitems = r.get_json()["posts"]["items"]
    assert all(p["status"] == "published" for p in pitems)
    assert all(p["id"] != draft_id for p in pitems)

    # 4) like + notification
    r = c.post(f"/api/posts/{post_id}/like", headers=auth_header(viewer_t))
    assert r.status_code == 200
    assert r.get_json()["liked_by_me"] is True

    r = c.get(f"/api/notifications", headers=auth_header(author_t))
    assert r.status_code == 200
    nitems = r.get_json()["items"]
    assert any(n["type"] == "like" for n in nitems)

    # self-like should not notify
    before = len(nitems)
    r = c.post(f"/api/posts/{post_id}/like", headers=auth_header(author_t))
    assert r.status_code == 200
    r = c.get(f"/api/notifications", headers=auth_header(author_t))
    assert len(r.get_json()["items"]) == before

    # 5) comment + edit/delete own + moderator delete any
    r = c.post(f"/api/posts/{post_id}/comments", json={"content": "Gran post"}, headers=auth_header(viewer_t))
    assert r.status_code == 201
    comment_id = r.get_json()["id"]

    r = c.put(f"/api/posts/{post_id}/comments/{comment_id}", json={"content": "Gran post editado"}, headers=auth_header(viewer_t))
    assert r.status_code == 200

    r = c.post(f"/api/posts/{post_id}/comments", json={"content": "Otro comentario"}, headers=auth_header(author_t))
    assert r.status_code == 201
    c2 = r.get_json()["id"]

    r = c.delete(f"/api/posts/{post_id}/comments/{c2}", headers=auth_header(moderator_t))
    assert r.status_code == 200

    # 6) views counter (viewer increments, author no)
    r = c.get(f"/api/posts/{post_id}", headers=auth_header(viewer_t))
    assert r.status_code == 200
    v1 = r.get_json().get("views", 0)

    r = c.get(f"/api/posts/{post_id}", headers=auth_header(author_t))
    assert r.status_code == 200
    v2 = r.get_json().get("views", 0)
    assert v2 == v1

    # 7) editor can edit foreign post
    r = c.put(f"/api/posts/{post_id}", json={"title": "Título editado por editor"}, headers=auth_header(editor_t))
    assert r.status_code == 200

    # 8) admin stats
    r = c.get("/api/admin/stats", headers=auth_header(admin_t))
    assert r.status_code == 200
    stats = r.get_json()
    assert "likes" in stats and "views" in stats and "posts_by_category" in stats

    print("OK: pruebas test client 19-28 completadas")


if __name__ == "__main__":
    run()
