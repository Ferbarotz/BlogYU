from flask import Flask, jsonify
from flask_cors import CORS
from .models import db, User
from .routes import api
from .extensions import bcrypt, mail, cors  # Asegúrate que cors está definido en extensions.py
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
import os
import click

jwt = JWTManager()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    # Configuración básica
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///blogyu.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT: usa variable de entorno si la defines; fallback a algo seguro para desarrollo
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-blogyu')

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Asegúrate de inicializar mail y bcrypt (y cors si usas la instancia)
    mail.init_app(app)
    try:
        bcrypt.init_app(app)
    except Exception:
        # algunos setups usan bcrypt = Bcrypt(app) en vez de init_app; este try evita romper si no aplica
        pass

    try:
        cors.init_app(app)
    except Exception:
        # Si ya usas CORS(app) no hace falta
        pass

    # Registrar blueprint /api
    app.register_blueprint(api, url_prefix='/api')

    @app.route('/')
    def home():
        return jsonify({
            "message": "Bienvenido al Backend de BlogYU",
            "status": "online",
            "api_endpoints": "/api/"
        }), 200

    with app.app_context():
        db.create_all()

    # Comando CLI para crear usuario administrador
    @app.cli.command("create-admin")
    @click.option("--email", prompt=True, help="Email del administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Contraseña del administrador")
    @click.option("--name", default="Admin", prompt=False, help="Nombre del administrador")
    def create_admin(email, password, name):
        """Crea un usuario administrador (is_admin=True)."""
        if User.query.filter_by(email=email).first():
            click.echo(f"Ya existe un usuario con email {email}")
            return
        pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        admin = User(name=name, email=email, password=pw_hash, is_admin=True, is_active=True)
        db.session.add(admin)
        db.session.commit()
        click.echo(f"Administrador creado: {email}")

    return app