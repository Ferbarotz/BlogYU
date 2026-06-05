import os
from api import create_app

app = create_app()

if __name__ == "__main__":
    # Railway inyecta automáticamente la variable PORT
    port = int(os.environ.get("PORT", 5000))
    # En producción debug debe ser False para seguridad y rendimiento
    app.run(host="0.0.0.0", port=port, debug=False)