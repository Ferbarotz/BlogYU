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

    # ── Flask-Mail / SendGrid ──────────────────────────────────────────
    MAIL_SERVER   = os.environ.get("MAIL_SERVER",   "smtp.sendgrid.net")
    MAIL_PORT     = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS  = os.environ.get("MAIL_USE_TLS",  "true").lower() in ("true", "1", "yes")
    MAIL_USE_SSL  = os.environ.get("MAIL_USE_SSL",  "false").lower() in ("true", "1", "yes")
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")   # "apikey" para SendGrid
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")   # API Key de SendGrid
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER")
    MAIL_SUPPRESS_SEND  = os.environ.get("MAIL_SUPPRESS_SEND", "false").lower() in ("true", "1", "yes")