# src/api/__init__.py  (sustituye o integra en tu create_app)
from flask import Flask, jsonify
from flask_cors import CORS
from .models import db
from .routes import api
from .extensions import bcrypt  # si tu extensions.py define bcrypt
from flask_jwt_extended import JWTManager
import os

jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # Configuración básica
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///blogyu.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT: usa variable de entorno si la defines; fallback a algo seguro para desarrollo
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-blogyu')

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

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

    return app