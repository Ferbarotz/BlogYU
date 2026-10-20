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
    from .models import TokenBlocklist

    # Crea SOLO la tabla token_blocklist si no existe (aditivo, no toca datos).
    with app.app_context():
        try:
            TokenBlocklist.__table__.create(bind=db.engine, checkfirst=True)
        except Exception:
            app.logger.exception("No se pudo asegurar la tabla token_blocklist")

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

    # CORS: nunca "*" en producción
    _cors_env = os.environ.get("CORS_ORIGINS")
    if _cors_env:
        cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
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

    # ¡Ojo! Las migraciones Alembic (flask db upgrade) son la única fuente de verdad
    # en producción. db.create_all() solo se permite explícitamente en desarrollo
    # con AUTO_CREATE_DB=true para iterar rápido sin tener que hacer migrate cada cambio.
    # En producción este bloque se omite intencionadamente.
    if app.config.get("AUTO_CREATE_DB"):
        with app.app_context():
            try:
                db.create_all()
                app.logger.warning(
                    "AUTO_CREATE_DB activado: db.create_all() ejecutado. "
                    "En producción usa siempre 'flask db upgrade' después de cambiar modelos."
                )
            except Exception:
                app.logger.exception("Error en db.create_all()")

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Contraseña del administrador")
    @click.option("--name", default="Admin", prompt=False, help="Nombre del administrador")
    def create_admin(email, password, name):
        if User.query.filter_by(email=email).first():
            click.echo(f"Ya existe un usuario con email {email}")
            return

        admin = User(
            name=name,
            email=email,
            password=password,
            is_admin=True,
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