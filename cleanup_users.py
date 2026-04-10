import sys, os, json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from api import create_app
from api.models import User, Post, PostImage, Comment
from api.extensions import db
# Importamos TravelRoute si existe en tus modelos. 
# Si el nombre es distinto, el script fallará y lo ajustaremos.
try:
    from api.models import TravelRoute
except ImportError:
    TravelRoute = None

app = create_app()

with app.app_context():
    admin_email = "ferbarotz@gmail.com"
    
    # 1. Buscar usuarios a borrar
    users_to_delete = User.query.filter(User.email != admin_email).all()
    user_ids = [u.id for u in users_to_delete]
    
    if not users_to_delete:
        print("ℹ️ No hay otros usuarios para borrar.")
    else:
        print(f"⚠️ Limpiando datos de {len(users_to_delete)} usuarios...")
        
        try:
            # 2. Borrar dependencias vinculadas a esos usuarios específicos
            # Borrar Comentarios de esos usuarios
            Comment.query.filter(Comment.user_id.in_(user_ids)).delete(synchronize_session=False)
            
            # Borrar Rutas de Viaje de esos usuarios (causa del error anterior)
            if TravelRoute:
                TravelRoute.query.filter(TravelRoute.user_id.in_(user_ids)).delete(synchronize_session=False)
            
            # Borrar Posts (y sus imágenes) de esos usuarios
            posts_to_delete = Post.query.filter(Post.user_id.in_(user_ids)).all()
            for post in posts_to_delete:
                PostImage.query.filter_by(post_id=post.id).delete(synchronize_session=False)
                db.session.delete(post)

            # 3. Ahora sí, borrar los Usuarios
            for u in users_to_delete:
                print(f" - Eliminando: {u.email}")
                db.session.delete(u)
            
            db.session.commit()
            print("💥 ¡Éxito! Base de datos limpia. Solo queda el Administrador.")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error crítico: {str(e)}")

    remaining = User.query.all()
    print(f"👥 Usuarios restantes en BD: {[u.email for u in remaining]}")
