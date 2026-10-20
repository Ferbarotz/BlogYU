import os
from api import create_app

app = create_app()

if __name__ == "__main__":
    # Seguridad: nunca levantar con debugger interactivo en ejecución directa.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
