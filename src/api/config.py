import os

# Baseline: situamos basedir en la carpeta src (un nivel arriba de api)
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, 'instance', 'blogyu.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-dev-secret")
    # FRONTEND_URL opcional (útil para reset password)
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")