import os

# Se importa como paquete "src.api" para que funcione al ejecutar `flask` o
# `python wsgi.py` desde la raíz del repo (igual que gunicorn "src.api:create_app()").
from src.api import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Seguridad: nunca levantar con debugger interactivo en ejecución directa.
    app.run(host="0.0.0.0", port=port, debug=False)
