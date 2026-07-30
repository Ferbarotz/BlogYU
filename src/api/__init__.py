import os
import logging
import click
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .config import Config
from .extensions import db, bcrypt, mail, jwt, migrate
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

    # Extensiones. Si alguna falla, lo registramos con traceback en vez de silenciarlo.
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    try:
        mail.init_app(app)
    except Exception:
        # El correo no es crítico para arrancar; se registra pero no se aborta.
        app.logger.exception("Error inicializando Flask-Mail; el envío de correos no funcionará")

    # Orígenes CORS: en prod se restringen vía CORS_ORIGINS (lista separada por
    # comas) o, en su defecto, FRONTEND_URL. En dev se permite todo ("*").
    _cors_env = os.environ.get("CORS_ORIGINS")
    if _cors_env:
        cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
    elif not app.config.get("AUTO_CREATE_DB"):  # heurística: prod
        cors_origins = [app.config.get("FRONTEND_URL", "*")]
    else:
        cors_origins = "*"

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        expose_headers=["Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    app.register_blueprint(api, url_prefix="/api")

    # Crear tablas automáticamente solo en desarrollo. En producción la fuente de
    # verdad del esquema es Alembic (flask db upgrade), no create_all().
    if app.config.get("AUTO_CREATE_DB"):
        with app.app_context():
            try:
                db.create_all()
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