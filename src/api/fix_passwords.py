import sys
import os

# Agrega la carpeta src al path para que Python encuentre los módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

from api import create_app
from api.models import db, User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Revisando {len(users)} usuarios...")
    passwords_map = {
        "ferbarotz23@gmail.com": "Admin@Fer@Bar@Ort@",
        "1@gmail.com": "111111",
        "2@gmail.com": "222222",
        "ferbarotz@gmail.com": "Admin@Fer@Bar@Ort@",
        "8@gmail.com": "888888"
    }
    for user in users:
        if user.email in passwords_map:
            user.password = passwords_map[user.email]
            print(f"Contraseña actualizada para: {user.email}")
    db.session.commit()
    print("¡Proceso finalizado con éxito!")
    