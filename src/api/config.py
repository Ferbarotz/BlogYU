import os
import secrets
from datetime import timedelta

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def _clean(v):
    return (v or "").strip().strip('"').strip("'").strip()


def _env_bool(name, default="false"):
    return _clean(os.environ.get(name, default)).lower() in ("true", "1", "yes", "on")


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
    _flask_env = _clean(os.environ.get("FLASK_ENV", "")).lower()
    _dev_mode = (
        _env_bool("FLASK_DEBUG", "false")
        or _flask_env in {"development", "dev", "test", "testing"}
        or bool(os.environ.get("PYTEST_CURRENT_TEST"))
    )
    _allow_insecure = _env_bool("ALLOW_INSECURE_SECRETS", "false")

    _sk = _clean(os.environ.get("SECRET_KEY"))
    _jsk = _clean(os.environ.get("JWT_SECRET_KEY"))

    if not _sk and _dev_mode:
        _sk = secrets.token_urlsafe(48)
    if not _jsk and _dev_mode:
        _jsk = secrets.token_urlsafe(48)

    if not _allow_insecure:
        if _clean(_sk).lower() in _INSECURE or len(_sk) < 32:
            raise ValueError(
                "SECRET_KEY ausente o insegura. "
                "Configúrala en variables de entorno con un valor aleatorio de al menos 32 caracteres."
            )
        if _clean(_jsk).lower() in _INSECURE or len(_jsk) < 32:
            raise ValueError(
                "JWT_SECRET_KEY ausente o insegura. "
                "Configúrala en variables de entorno con un valor aleatorio de al menos 32 caracteres."
            )

    SECRET_KEY = _sk
    JWT_SECRET_KEY = _jsk

    SQLALCHEMY_DATABASE_URI = _normalize_db_url(os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(basedir, "instance", "blogyu.db")
    ))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Limita el tamano de CUALQUIER peticion (413 si se supera); protege la RAM de Render
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    # Duracion de la sesion (el default de flask-jwt-extended es 15 min)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # Envío de correo vía SendGrid Web API (HTTPS).
    MAIL_PASSWORD = (os.environ.get("MAIL_PASSWORD") or "").strip() or None

    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "memory://")
    RATELIMIT_STORAGE_URI = RATELIMIT_STORAGE_URL  # nombre usado por Flask-Limiter 3.x
