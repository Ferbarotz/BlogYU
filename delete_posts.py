import sys, os, json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from api import create_app
from api.models import Post, PostImage, Comment
from api.extensions import db

app = create_app()

with app.app_context():
    # 1. Backup de seguridad
    all_posts = Post.query.all()
    if all_posts:
        backup_data = [p.serialize() for p in all_posts]
        with open("posts_backup.json", "w", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        print(f"✅ Backup realizado: {len(all_posts)} posts guardados en posts_backup.json")
    
    # 2. Borrado masivo (incluyendo comentarios para evitar errores de claves foráneas)
    try:
        print("Eliminando comentarios...")
        Comment.query.delete()
        print("Eliminando imágenes de posts...")
        PostImage.query.delete()
        print("Eliminando posts...")
        num_deleted = Post.query.delete()
        
        db.session.commit()
        print(f"💥 ¡Éxito! Se han eliminado {num_deleted} publicaciones y todas sus relaciones.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error durante el borrado: {str(e)}")
