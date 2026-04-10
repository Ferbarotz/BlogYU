import os
import click
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db, bcrypt, mail, jwt, migrate  # migrate debería ser la instancia aquí
from .routes import api
from .models import User  # aseguramos que modelos se importen para que Alembic los vea

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    # asegurar carpeta instance
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except Exception:
        pass

    # Inicializar extensiones
    db.init_app(app)
    # Si en src/extensions.py defines migrate = Migrate(), entonces:
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

    # Habilitar CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        expose_headers=["Authorization"]
    )

    # Registrar blueprints
    app.register_blueprint(api, url_prefix="/api")

    @app.route("/")
    def root():
        return jsonify({
            "message": "Backend de BlogYU",
            "status": "online",
            "api_root": "/api/"
        }), 200

    # Crear tablas si no existen (compatible con migraciones)
    with app.app_context():
        try:
            db.create_all()
        except Exception:
            pass

    # CLI para crear admin
    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Contraseña del administrador")
    @click.option("--name", default="Admin", prompt=False, help="Nombre del administrador")
    def create_admin(email, password, name):
        if User.query.filter_by(email=email).first():
            click.echo(f"Ya existe un usuario con email {email}")
            return
        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        admin = User(name=name, email=email, password=pw_hash, is_admin=True, is_active=True)
        db.session.add(admin)
        db.session.commit()
        click.echo(f"Administrador creado: {email}")

    return app