from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db       = SQLAlchemy()
bcrypt   = Bcrypt()
jwt      = JWTManager()
migrate  = Migrate()


def _client_ip():
    """IP real del cliente detrás del proxy de Render (X-Forwarded-For)."""
    from flask import request
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address()


# Sin límites globales: solo se limitan explícitamente los endpoints sensibles
# (login, register, forgot-password) para no bloquear assets ni uso normal.
limiter  = Limiter(key_func=_client_ip, default_limits=[])
