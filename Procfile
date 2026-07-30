release: sh -c "FLASK_APP=src.api:create_app flask db upgrade"
web: gunicorn "src.api:create_app()" --bind 0.0.0.0:$PORT
