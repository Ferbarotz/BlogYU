import os

# Baseline: situamos basedir en la carpeta src (un nivel arriba de api)
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


# ── Helpers de parseo defensivo (a nivel de módulo) ────────────────────
# Limpian comillas/espacios para que un valor mal pegado en Render nunca
# tire la app al arrancar.
def _clean(v):
    return (v or "").strip().strip('"').strip("'").strip()


def _env_bool(name, default="false"):
    return _clean(os.environ.get(name, default)).lower() in ("true", "1", "yes", "on")


def _env_int(name, default):
    raw = _clean(os.environ.get(name, str(default)))
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default

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
    MAIL_SERVER   = _clean(os.environ.get("MAIL_SERVER", "smtp.sendgrid.net")) or "smtp.sendgrid.net"
    MAIL_PORT     = _env_int("MAIL_PORT", 587)
    MAIL_USE_TLS  = _env_bool("MAIL_USE_TLS", "true")
    MAIL_USE_SSL  = _env_bool("MAIL_USE_SSL", "false")
    MAIL_USERNAME = _clean(os.environ.get("MAIL_USERNAME")) or None   # "apikey" para SendGrid
    MAIL_PASSWORD = (os.environ.get("MAIL_PASSWORD") or "").strip() or None   # API Key de SendGrid
    MAIL_DEFAULT_SENDER = _clean(os.environ.get("MAIL_DEFAULT_SENDER")) or None
    MAIL_SUPPRESS_SEND  = _env_bool("MAIL_SUPPRESS_SEND", "false")