# Informe de Tareas - BlogYU
**Fecha:** Wed Oct 21 2026  
**Estado:** Points 1 & 2 completed by user; remaining items reviewed

---

## ✅ TAREAS COMPLETADAS (Por el usuario)

### Punto 1: Corregir placeholder de longitud de contraseña
- **Archivo:** `src/front/pages/Register.jsx`, línea 190
- **Cambio:** `placeholder="Mínimo 6 caracteres"` → `placeholder="Mínimo 8 caracteres"`
- **Verificación:** ✅ Confirmado en el archivo

### Punto 2: Agregar validación de formato de email
- **Archivo:** `src/api/routes.py`, línea 330
- **Cambio:** Añadido `if not re.match(r"[^@]+@[^@]+\.[^@]+",email):` después de verificar que el usuario no existe
- **Mensaje devuelto:** `"Formato de email invalido"` con status 400
- **Verificación:** ✅ Confirmado en el archivo

---

## 📋 TAREAS Y RECOMENDACIONES PENDIENTES/SUGERIDAS

### Punto 3: Considerar soporte de "Borrador" (draft) - OPCIONAL
- **Estado actual:** El modelo `Post` ya tiene la columna `status` con default "published" (`src/api/models.py` línea 69)
- **Qué hacer (si se requiere):**
  - El endpoint `POST /api/posts` podría aceptar un parámetro `status` opcional
  - Opcional: Agregar campo "Guardar como borrador" en el frontend `NewPost.jsx`
- **Prioridad:** Baja - funcionalidad opcional, el flujo actual crea posts publicados directamente

### Punto 4: Documentar requisito de Cloudinary - ✅ YA ESTÁ DOCUMENTADO
- **Archivo:** `.env.example`, línea 27
- **Contenido:** `CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name`
- **Verificación:** ✅ La variable ya está en `.env.example` y en `AGENTS.md` (línea 90)
- **Acción:** No requiere cambios adicionales

### Punto 5: Regex de formato de email - ✅ YA INCLUIDO en Punto 2
- El cambio del Punto 2 ya incluye la validación de formato
- No se necesitan cambios adicionales

### Punto 6: Alinear mensajes de longitud de contraseña - ✅ YA INCLUIDO en Punto 1
- Tanto frontend como backend ahora coinciden en "mínimo 8 caracteres"
- No se necesitan cambios adicionales

### Punto 7: Verificar flujo de creación de admin para producción
- **Comando:** `flask create-admin` (desde raíz con `FLASK_APP=src.api:create_app`)
- **Pasos:**
  1. Asegurar `DATABASE_URL` apunta a PostgreSQL en Render (no SQLite local)
  2. Ejecutar migraciones: `flask db upgrade` antes de crear el admin
  3. Opcionalmente: `flask db stamp 440f3ce32eef` si la BD ya tiene las tablas
- **Advertencia:** El propio comando advierte si se usa SQLite local y no es la BD de Render
- **Prioridad:** Media - importante antes de desplegar a producción

### Punto 8: Revisar validación de categorías
- **Flujo actual:**
  - Frontend `NewPost.jsx` tiene autocomplete con 6 categorías predefined
  - Backend `/api/categories` devuelve las mismas 6 categorías con conteo de posts
  - Backend acepta cualquier string en `Post.category` (sin validación estricta)
- **Observación:** El sistema está diseñado para guiar al usuario con categorías sugeridas, pero aceptar valores personalizados
- **Prioridad:** Baja - por diseño, el frontend controla la entrada del usuario

### Punto 9: Probar flujo like/unlike
- **Endpoint:** `POST /api/posts/<id>/like`
- **Mecanismo:** Alterna entre agregar y remover like usando modelo `Like` con constraint única en `(user_id, post_id)`
- **Verificación:** El código está implementado en `src/api/routes.py` líneas 557-571
- **Prioridad:** Media - recomendable probar manualmente después de los cambios

### Punto 10: Revisar protección admin en frontend
- **Hecho actual:** `ProtectedRoute` no verifica `adminOnly`
- **Protección real:** Decorador `@admin_required` en el backend (`src/api/routes.py` línea 207)
- **Riesgo:** Cualquier usuario autenticado puede navegar a `/admin` en el frontend, pero solo los admins pueden ejecutar operaciones admin en el backend
- **Documentación:** Ya advertido en `AGENTS.md` bajo "No confíes en `ProtectedRoute` para restringir admin"
- **Prioridad:** Baja - comportamiento intencional, la seguridad está en el backend

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Status |
|-----------|--------|
| **Cambios críticos (Points 1-2)** | ✅ Completados |
| **Documentación** | ✅ Al día (.env.example ya tiene CLOUDINARY_URL) |
| **Soportes opcionales** | ℹ️ Nota realizada (soporte draft) |
| **Configuración producción** | ℹ️ Pendiente verificar antes de desplegar |
| **Testing** | ℹ️ Flujo like/unlike listo para testear |

### Próximos pasos recomendados:
1. **Antes de desplegar:** Ejecutar `flask db upgrade` y verificar creación de admin con PostgreSQL
2. **Testeo manual:** Probar el flujo like/unlike en posts creados
3. **Considerar:** Si se necesita soporte de borradores, es una mejora opcional que no bloquea el funcionamiento actual

---
*Informe generado automáticamente después de revisar los cambios realizados por el usuario*