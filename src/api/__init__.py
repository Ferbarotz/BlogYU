from flask import Flask, jsonify
from .extensions import db, migrate, bcrypt, jwt, cors
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)

    # Registrar Blueprint de rutas API (se importa aquí para evitar import cycles)
    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    @app.route('/')
    def home():
        return jsonify({"msg": "API BlogYU activa y funcionando"}), 200

    return app
