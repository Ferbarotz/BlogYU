# CHANGELOG - Auditoria de seguridad y calidad

Proyecto: BlogYU (Flask + React)
Repo: https://github.com/Ferbarotz/BlogYU
Produccion: https://blockyu.onrender.com
Fecha de cierre: 2026-10-29

Alcance: puntos 5-10 de la auditoria + menores de calidad + limpieza de repo e
infraestructura. Todo parcheado, desplegado en Render y verificado en produccion.

Nota: el historial fue reescrito con git filter-repo (limpieza del tar.gz), por
lo que los cambios se referencian por mensaje de commit y no por hash.

## Punto 5 - Notificaciones (500 / 404)
- Problema: los endpoints de notificaciones fallaban (import ausente y
  new_comment.id inexistente al crear la notificacion).
- Fix: import de modelos y campo correcto al notificar.
- Verificado: GET /api/notifications 200, GET /api/notifications/read 200,
  DELETE /api/notifications/clear-read 200.

## Test-mail sin proteccion
- Problema: el endpoint de prueba de correo quedo expuesto sin autenticacion.
- Fix: @jwt_required() + @admin_required.
- Commit: "Seguridad: re-aplicar proteccion a /test-mail".
- Verificado: 401 sin token en produccion.

## Punto 6 - Borrado por admin con 500 (violacion de FK)
- Problema: admin_delete_post y admin_delete_user no limpiaban comentarios ni
  likes antes del delete -> ForeignKeyViolation cuando habia comentarios.
- Fix: limpieza manual (Comment, PostImage, Like) reutilizando la logica de
  delete_post en ambos endpoints admin.
- Verificado: post de prueba con comentarios de dos usuarios ->
  admin_delete_post 200 y admin_delete_user 200.

## Punto 7 - Imagenes nunca borradas de Cloudinary
- Problema: el public_id se calculaba mal y destroy() fallaba en silencio.
- Fix: extraccion robusta del public_id y cloudinary.uploader.destroy con
  invalidate=True en los flujos de borrado y edicion.

## Punto 8 - Contador de vistas siempre en 0
- Problema: post_stats leia post.views pero nada lo incrementaba.
- Fix: get_post incrementa views +1 con guardia anti-F5 (cookie viewed_<id>,
  una vista por visitante y hora).

## Punto 9 - Rutas de uploads duplicadas (/api/api/uploads)
- Problema: con url_prefix="/api", la ruta /api/uploads/... generaba
  /api/api/uploads/... y colisionaba con el servido de ficheros /uploads/<path>.
- Fix: eliminada la ruta duplicada uploaded_file; listado movido a /uploads-list
  protegido con jwt+admin; devuelve {"files": []} si instance/uploads no existe
  (evitaba un 500 en Render).
- Commits: "Fix: unificar rutas de uploads..." y "Fix: manejar carpeta uploads
  inexistente".
- Verificado: /api/api/uploads/x 404, /api/uploads/list 404,
  /api/uploads/home-background 200, /uploads-list 401 sin token y 200 con
  {"files":[]} con token admin.

## Punto 10 - Reset de contrasena sin validacion ni bloqueo de token
- Problema: reset_password aceptaba cualquier access token valido (incluido el
  de sesion), no exigia longitud minima y el token era reutilizable 30 minutos.
- Fix: forgot_password crea el token con additional_claims={"purpose": "reset"};
  reset_password verifica el claim, bloquea el jti en TokenBlocklist tras usarlo
  (un solo uso) y valida longitud 8-128.
- Commit: "Seguridad: reset con claim purpose, token de un solo uso y validacion
  de longitud".
- Verificado: token de sesion usado como reset -> 400 "Token invalido o
  expirado".

## Menores / calidad
- update_post (JSON): eliminada la limpieza de imagenes duplicada (queda solo el
  bloque que purga Cloudinary y el fichero local).
- login: el 500 de generacion de token ya no devuelve "detail": str(e) (no
  filtra internals).
- like_post: 404 si el post no existe (antes 500).
- Imports muertos eliminados: import re dentro de register e import bcrypt en
  models.py (el hashing es werkzeug).
- Commit: "Calidad: dedup update_post, sin detail en login 500, 404 en likes,
  imports limpios" (6b604d5).
- Verificado: update JSON 200, like sobre post inexistente 404, delete 200.

## Repo e infraestructura
- Desversionados copia-proyecto.tar.gz (51 MB) y dist/; .gitignore con
  *.tar.gz, dist/ y *.bak.
- Historial reescrito con git filter-repo y force push (fafe870).
- Rotacion de credenciales de la base de datos en Render (DATABASE_URL
  actualizada en Environment), verificada con login real 200.

## Notas a futuro
- El token JWT se guarda en localStorage: asumible para este proyecto, pero es
  el vector clasico de XSS. No renderizar HTML aportado por usuarios con
  dangerouslySetInnerHTML.
- /uploads-list lista ficheros locales; las imagenes de Cloudinary no aparecen.
- Los links de reset emitidos antes del endurecimiento quedaron invalidados.
