# BlogYU

Blog full-stack con posts geolocalizados: los usuarios publican entradas con imágenes y ubicación en mapa. Backend Flask + API REST, frontend React (SPA).

## Stack

- **Backend**: Python/Flask (application factory), SQLite (dev) / PostgreSQL (prod), Flask-Migrate (Alembic), Cloudinary para imágenes
- **Frontend**: React 18 + React Router v6, Webpack 5 (dev server), sin TypeScript. Bootstrap 5 para estilos; Leaflet / react-leaflet para los mapas de ubicación de los posts
- **Auth**: Flask-JWT-Extended (tokens almacenados en `localStorage`)
- **Tests**: solo un smoke test trivial (`test_app.py`); no hay suite real
- **Objetivo de despliegue**: Railway/Render + Gunicorn

## Comandos

### Backend

```bash
# Instalar dependencias de Python
pipenv install          # o: pip install -r requirements.txt

# Servidor de desarrollo de Flask (FLASK_APP se resuelve vía src/api/__init__.py:create_app)
cd src && flask run --port 5000

# Alternativa con wsgi.py (debe ejecutarse desde src/ para que el import 'api' funcione)
cd src && python ../wsgi.py

# Migraciones de base de datos
flask db migrate -m "descripción"
flask db upgrade

# Crear usuario admin vía CLI
flask create-admin
```

### Frontend

```bash
npm install
npm start        # dev server, puerto 8080, proxy /api → http://127.0.0.1:5000
npm run build    # build de producción → dist/
```

### Full-stack en local

Arranca Flask en el puerto 5000 **primero**, luego `npm start`. El dev server de Webpack redirige (proxy) todas las peticiones `/api/*` a Flask.

## Estructura del proyecto

- `src/api/` — Backend Flask. `__init__.py` = factory `create_app()`; `routes.py` = todos los endpoints bajo `/api/...`; `extensions.py` = instancias de extensiones; `config.py` = configuración por entorno
- `src/front/` — Frontend React. `main.jsx` = entrypoint (`StoreProvider` → `BrowserRouter` → `Navbar` + `AppRoutes`); `store.js` = estado global vía Context; `api/backend.js` = helper `authFetch`
- `migrations/versions/` — scripts de migración Alembic
- `instance/` — DB de desarrollo SQLite (`blogyu.db`)
- `dist/` — build de producción del frontend (servido por Flask en prod)

### Arquitectura y prefijo de URL

- **`src/api/__init__.py`** — factory `create_app()`. Registra extensiones, CORS (`/api/*`), el Blueprint `api`, y en producción sirve `dist/` como fallback SPA para rutas que no son de la API.
- **`src/api/routes.py`** — Todos los endpoints de la API en un único archivo.
- **`src/front/store.js`** — Estado global solo con React Context (`token`, `user`), persistido en `localStorage`. Sin Redux/Zustand.
- **`src/front/utils/backend.js`** — Duplicado idéntico de `api/backend.js`; ambos existen y se puede importar cualquiera.
- Todos los endpoints Flask están bajo `/api/`; el resto de rutas son del frontend. En dev lo separa el proxy de Webpack; en prod Flask sirve `dist/index.html` para cualquier ruta no-`/api/`.

## Base de datos / Migraciones

- DB de desarrollo: `instance/blogyu.db` (SQLite, creada automáticamente en la raíz y en `src/instance/`)
- `DATABASE_URL` cambia a PostgreSQL en producción
- Ejecuta siempre `flask db upgrade` después de traer nuevos archivos de migración
- Los scripts de migración viven en `migrations/versions/`
- Los comandos `flask db ...` se ejecutan **desde la raíz del repo** (ahí está `migrations/`) con `FLASK_APP=src.api:create_app`.

### Esquema y `create_all` vs Alembic

- El historial de migraciones se **consolidó en un baseline único**: `migrations/versions/440f3ce32eef_baseline_schema.py` (contiene las 8 tablas completas). Las migraciones antiguas (rotas/incompletas) están archivadas en `migrations/versions/_archive/` y Alembic no las lee.
- `AUTO_CREATE_DB` (en `config.py`): `True` en desarrollo (permite `db.create_all()` al arrancar para trabajar sin migrar) y `False` en producción (Alembic es la única fuente de verdad). Se puede forzar con la env var `AUTO_CREATE_DB=true/false`.
- **Producción**: el `Procfile` tiene una fase `release` que ejecuta `flask db upgrade` automáticamente en cada despliegue. No se usa `create_all` en prod.
- **BD de prod EXISTENTE creada antes con `create_all`** (ya tiene las tablas): márquala una sola vez con `FLASK_APP=src.api:create_app flask db stamp 440f3ce32eef` antes de confiar en `upgrade` (si no, el baseline fallaría con "table already exists").
- Regla: BD vacía → `flask db upgrade`; BD que ya tiene las tablas → `flask db stamp 440f3ce32eef`.
- Al cambiar modelos: `flask db migrate -m "descripción"` + `flask db upgrade`.


## Variables de entorno

Requeridas para la funcionalidad completa (ver `src/api/config.py`). El `.env` en la raíz lo carga `python-dotenv`.

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Por defecto SQLite; en prod se pone la URI de Postgres |
| `SECRET_KEY` | Secret de Flask |
| `JWT_SECRET_KEY` | Firma de JWT |
| `CLOUDINARY_URL` | Subida de imágenes (requerida para imágenes de posts/rutas) |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Emails de restablecimiento de contraseña |
| `FRONTEND_URL` | Usada en los enlaces de los emails de restablecimiento |

## Convenciones

- Backend: endpoints siempre bajo `/api/`; las extensiones se importan desde `src/api/extensions.py`, no se instancian sueltas.
- Frontend: sin TypeScript; estado compartido vía Context en `store.js`, no añadir librerías de estado.
- Peticiones al backend desde el front: usar el helper `authFetch` con URLs relativas (funciona en dev y prod).
- Validar toda entrada del usuario en el backend antes de usarla; los endpoints admin usan el decorador `admin_required`.

## No hagas

- **No expongas en producción** el endpoint `GET /api/secret-setup-admin-xyz123`: crea un admin con credenciales en texto plano incrustadas en `routes.py`.
- **No confíes en `ProtectedRoute` para restringir admin**: no aplica `adminOnly`, cualquier usuario autenticado puede navegar a `/admin` en el frontend. La protección real está en el backend con `admin_required`.
- **No edites ni trates como fuente de verdad los archivos sueltos**: `src/api/routes.py.bak`, `routes.py.current.bak`, `webpack.config.js.save`, `fix_passwords.py.save`, scripts puntuales (`cleanup_users.py`, `delete_posts.py`, `fix_passwords.py`), volcados JSON (`*_backup.json`, `users_before_cleanup.json`), y los JS sueltos en el backend (`src/api/backend.js`, `src/api/users.js`).
- **No uses `src/front/hooks/useGlobalReducer.jsx`**: está vacío y no se usa en ningún sitio.
- No ejecutes `wsgi.py` desde la raíz del repo: su `from api import create_app` solo funciona desde `src/`. El `Procfile` (gunicorn) usa `"src.api:create_app()"` y sí funciona desde la raíz.
- No subas archivos `.env*` al repositorio.
- No instales dependencias nuevas sin avisar.

## Flujo de trabajo

- Antes de una tarea no trivial, propón un plan y espera mi OK.
- Una tarea a la vez; al terminar, dime qué cambiaste para que lo revise.
- Si no estás seguro al 80%, pregunta. No inventes.
- No hay linting, formateo, type-checking ni CI/CD configurados: revisa los cambios manualmente antes de dar por cerrada una tarea.

## Documentación

- `src/api/config.py` — fuente de verdad de la configuración y variables de entorno.
- `migrations/versions/` — historial de esquema de la base de datos.
