import os
import logging
import click
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .config import Config
from .extensions import db, bcrypt, jwt, migrate, limiter
from .routes import api
from .models import User


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    if not app.debug:
        logging.basicConfig(level=logging.INFO)

    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except Exception:
        app.logger.exception("No se pudo crear instance_path (%s)", app.instance_path)

    # Extensiones
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # JWT Blocklist: invalida tokens en logout
    # La tabla token_blocklist se gestiona por migraciones (flask db upgrade).
    from .models import TokenBlocklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        try:
            return db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar() is not None
        except Exception:
            db.session.rollback()
            app.logger.exception("Error consultando token_blocklist")
            return False

    # CORS: no permitir wildcard. Siempre lista blanca explícita.
    _cors_env = os.environ.get("CORS_ORIGINS")
    if _cors_env:
        parsed = [o.strip() for o in _cors_env.split(",") if o.strip()]
        cors_origins = [o for o in parsed if o != "*"]
        if not cors_origins:
            raise ValueError(
                "CORS_ORIGINS no puede ser '*' ni quedar vacío. "
                "Define al menos un origen explícito."
            )
    else:
        frontend = app.config.get("FRONTEND_URL", "")
        cors_origins = [frontend] if frontend else ["http://localhost:3000"]

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        expose_headers=["Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    app.register_blueprint(api, url_prefix="/api")

    # Esquema de BD: siempre por migraciones Alembic (flask db upgrade).

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Contraseña del administrador")
    @click.option("--name", default="Admin", prompt=False, help="Nombre del administrador")
    def create_admin(email, password, name):
        from sqlalchemy.engine.url import make_url

        email = email.strip().lower()
        url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
        destino = f"{url.drivername}://{url.host or ''}/{url.database or ''}"
        click.echo(f"Base de datos: {destino}")
        if url.drivername.startswith("sqlite"):
            click.echo("AVISO: es una SQLite local, NO la base de datos de Render. "
                       "Exporta DATABASE_URL con la External Database URL para crear el admin en Render.")

        user = User.query.filter(db.func.lower(User.email) == email).first()
        if user:
            # Si ya existe: se promociona a admin y se actualiza su contraseña.
            user.is_admin = True
            user.role = "admin"
            user.is_active = True
            user.password = password
            db.session.commit()
            click.echo(f"Usuario existente promocionado a administrador: {email}")
            return

        admin = User(
            name=name,
            email=email,
            password=password,
            is_admin=True,
            role="admin",
            is_active=True
        )
        db.session.add(admin)
        db.session.commit()
        click.echo(f"Administrador creado: {email}")

    # --- SERVIR FRONTEND EN PRODUCCIÓN ---
    DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'dist'))

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path.startswith('api/'):
            return jsonify({"error": "Not found"}), 404
        full_path = os.path.join(DIST_DIR, path)
        if path and os.path.exists(full_path):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, 'index.html')

    return app