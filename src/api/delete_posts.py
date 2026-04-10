# delete_posts.py
import sys, os, json

# Configurar el path para encontrar el paquete 'api'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from api import create_app
from api.models import Post, PostImage
from api.extensions import db

app = create_app()

with app.app_context():
    # 1. Hacer Backup de seguridad
    all_posts = Post.query.all()
    if all_posts:
        backup_data = [p.serialize() for p in all_posts]
        with open("posts_backup.json", "w", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        print(f"✅ Backup realizado: {len(all_posts)} posts guardados en posts_backup.json")
    else:
        print("ℹ️ No hay posts para respaldar.")

    # 2. Confirmación de borrado
    count = Post.query.count()
    if count == 0:
        print("📭 No hay publicaciones en la base de datos.")
        sys.exit()

    print(f"⚠️ Se van a eliminar {count} publicaciones y todas sus imágenes asociadas.")
    confirm = input("Escribe DELETE para confirmar el borrado total: ")

    if confirm.strip() == "DELETE":
        try:
            # Borramos primero las imágenes de los posts para evitar errores de claves foráneas
            PostImage.query.delete()
            # Borramos todos los posts
            Post.query.delete()
            
            db.session.commit()
            print(f"💥 ¡Éxito! Se han eliminado todas las publicaciones.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error durante el borrado: {str(e)}")
    else:
        print("❌ Operación cancelada. No se ha borrado nada.")