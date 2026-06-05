import os
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

    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except Exception:
        pass

    db.init_app(app)
    migrate.init_app(app, db)

    try:
        jwt.init_app(app)
    except Exception:
        pass

    try:
        bcrypt.init_app(app)
    except Exception:
        pass

    try:
        mail.init_app(app)
    except Exception:
        pass

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        expose_headers=["Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    app.register_blueprint(api, url_prefix="/api")

    with app.app_context():
        try:
            db.create_all()
        except Exception:
            pass

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Contraseña del administrador")
    @click.option("--name", default="Admin", prompt=False, help="Nombre del administrador")
    def create_admin(email, password, name):
        if User.query.filter_by(email=email).first():
            click.echo(f"Ya existe un usuario con email {email}")
            return

        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        admin = User(
            name=name,
            email=email,
            password=pw_hash,
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