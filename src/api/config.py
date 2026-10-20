import os


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


def _normalize_db_url(url):
    """Fuerza el driver psycopg2 (instalado) para PostgreSQL.
    SQLAlchemy >= 2.1 usa psycopg v3 por defecto en 'postgresql://'."""
    url = _clean(url)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


_INSECURE = {"dev-secret", "jwt-dev-secret", "secret", "changeme", ""}


class Config:
    _sk  = os.environ.get("SECRET_KEY", "dev-secret")
    _jsk = os.environ.get("JWT_SECRET_KEY", "jwt-dev-secret")
    _prod = not _env_bool("FLASK_DEBUG", "false")

    if _prod and _clean(_sk).lower() in _INSECURE:
        raise ValueError(
            "SECRET_KEY usa el valor inseguro por defecto. "
            "Configúrala en las Variables de Entorno de Render."
        )
    if _prod and _clean(_jsk).lower() in _INSECURE:
        raise ValueError(
            "JWT_SECRET_KEY usa el valor inseguro por defecto. "
            "Configúrala en las Variables de Entorno de Render."
        )

    SECRET_KEY     = _sk
    JWT_SECRET_KEY = _jsk

    SQLALCHEMY_DATABASE_URI = _normalize_db_url(os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(basedir, "instance", "blogyu.db")
    ))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # --- Correo ---
    # Flask-Mail no se usa en el flujo actual; todo el envío de correos usa SendGrid
    # Web API (HTTPS). MAIL_PASSWORD se reutiliza como fallback para la API key de
    # SendGrid (ver _get_sendgrid_api_key en routes.py).
    MAIL_PASSWORD       = (os.environ.get("MAIL_PASSWORD") or "").strip() or None

    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")
    RATELIMIT_STORAGE_URI = RATELIMIT_STORAGE_URL  # nombre usado por Flask-Limiter 3.x