from src.api.app import create_app
from src.api.models import db, User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Revisando {len(users)} usuarios...")
    for user in users:
        # Si la contraseña no empieza por 'scrypt' o 'pbkdf2' (hashes comunes), 
        # asumimos que es texto plano y la actualizamos.
        # Nota: Como definimos el setter en el modelo, simplemente asignar 
        # user.password = valor hará el hash automáticamente.
        
        # Intentamos obtener la contraseña actual. 
        # Si falla por ser write-only, usamos un valor por defecto o el email para resetearla.
        try:
            # Este script asume que conoces las claves o quieres resetearlas a las que me diste
            passwords_map = {
                "ferbarotz23@gmail.com": "Admin@Fer@Bar@Ort@",
                "1@gmail.com": "111111",
                "2@gmail.com": "222222",
                "ferbarotz@gmail.com": "Admin@Fer@Bar@Ort@",
                "8@gmail.com": "888888"
            }
            
            if user.email in passwords_map:
                user.password = passwords_map[user.email]
                print(f"Contraseña actualizada para: {user.email}")
        except Exception as e:
            print(f"Error con {user.email}: {e}")
            
    db.session.commit()
    print("¡Proceso finalizado con éxito!")
