#!/usr/bin/env python3
"""
Herramientas seguras para la base de datos de BlogYU.

  backup   Copia de seguridad (solo LECTURA del origen) a backups/*.json
  copy     Copia todos los datos a una base de datos NUEVA (sin borrar nada)
  restore  Restaura un archivo de backup en una base de datos NUEVA y vacía

Las direcciones se leen de variables de entorno (nunca se escriben en el código):
  SOURCE_DATABASE_URL  base de datos de origen (Render, External URL)
  TARGET_DATABASE_URL  base de datos de destino (Neon, Render de pago, ...)

Ejemplos:
  python scripts/db_tools.py backup
  python scripts/db_tools.py copy
  python scripts/db_tools.py restore backups/blogyu_backup_XXXX.json

Garantías:
  - El origen se abre en modo SOLO LECTURA.
  - El destino debe tener las tablas creadas y VACÍAS; si encuentra datos, se
    detiene sin tocar nada. Todo se escribe en una única transacción: si algo
    falla, no queda nada a medias.
"""
import json
import os
import sys
from datetime import datetime

import psycopg2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKUP_DIR = os.path.join(ROOT, "backups")
SKIP_TABLES = {"alembic_version"}  # la gestiona `flask db upgrade`


def _url(var):
    url = (os.environ.get(var) or "").strip().strip('"').strip("'")
    if not url:
        sys.exit(f"❌ Falta la variable de entorno {var}")
    url = url.replace("postgresql+psycopg2://", "postgresql://", 1)
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def _connect(var, readonly=False):
    conn = psycopg2.connect(_url(var), connect_timeout=20)
    if readonly:
        conn.set_session(readonly=True)
    return conn


def _tables_in_fk_order(cur):
    """Tablas de 'public' ordenadas para que los padres vayan antes que los hijos."""
    cur.execute("SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' AND table_type='BASE TABLE'")
    tables = sorted(r[0] for r in cur.fetchall())
    cur.execute("""
        SELECT tc.relname, rc.relname
        FROM pg_constraint c
        JOIN pg_class tc ON tc.oid = c.conrelid
        JOIN pg_class rc ON rc.oid = c.confrelid
        JOIN pg_namespace n ON n.oid = tc.relnamespace
        WHERE c.contype = 'f' AND n.nspname = 'public'
    """)
    deps = {t: set() for t in tables}
    for child, parent in cur.fetchall():
        if child != parent and child in deps and parent in deps:
            deps[child].add(parent)
    ordered, done = [], set()
    while len(ordered) < len(tables):
        ready = [t for t in tables if t not in done and deps[t] <= done]
        if not ready:  # ciclo: añadir el resto tal cual
            ready = [t for t in tables if t not in done]
        for t in ready:
            ordered.append(t)
            done.add(t)
    return ordered


def _columns(cur, table):
    cur.execute("SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", (table,))
    return [r[0] for r in cur.fetchall()]


def _read_all(conn):
    """Lee todas las tablas. Devuelve {'order': [...], 'tables': {t: {'columns', 'rows'}}}."""
    data = {"order": [], "tables": {}}
    with conn.cursor() as cur:
        for t in _tables_in_fk_order(cur):
            cols = _columns(cur, t)
            cur.execute('SELECT {} FROM "{}"'.format(", ".join(f'"{c}"' for c in cols), t))
            rows = [list(r) for r in cur.fetchall()]
            data["order"].append(t)
            data["tables"][t] = {"columns": cols, "rows": rows}
    return data


def _counts(data):
    return {t: len(data["tables"][t]["rows"]) for t in data["order"]}


def _print_counts(title, counts):
    print(f"\n{title}")
    for t, n in counts.items():
        print(f"  {t:<20} {n:>6} filas")


def _write(conn, data):
    """Escribe los datos en un destino con tablas vacías, en una sola transacción."""
    with conn.cursor() as cur:
        target_tables = set(_tables_in_fk_order(cur))
        tables = [t for t in data["order"] if t not in SKIP_TABLES]

        missing = [t for t in tables if t not in target_tables]
        if missing:
            sys.exit("❌ En el destino faltan tablas: " + ", ".join(missing) +
                     "\n   Primero crea el esquema con `flask db upgrade` apuntando al destino.")

        not_empty = []
        for t in tables:
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            n = cur.fetchone()[0]
            if n:
                not_empty.append(f"{t} ({n})")
        if not_empty:
            sys.exit("❌ El destino ya tiene datos en: " + ", ".join(not_empty) +
                     "\n   No se ha tocado nada. Usa una base de datos nueva y vacía.")

        for t in tables:
            cols = data["tables"][t]["columns"]
            target_cols = set(_columns(cur, t))
            keep = [i for i, c in enumerate(cols) if c in target_cols]
            if len(keep) != len(cols):
                lost = [cols[i] for i in range(len(cols)) if i not in keep]
                sys.exit(f"❌ La tabla {t} del destino no tiene las columnas {lost}. "
                         "Ejecuta `flask db upgrade` en el destino.")
            rows = data["tables"][t]["rows"]
            if not rows:
                continue
            sql = 'INSERT INTO "{}" ({}) VALUES ({})'.format(
                t, ", ".join(f'"{c}"' for c in cols), ", ".join(["%s"] * len(cols)))
            cur.executemany(sql, rows)

        # Ajustar los contadores de id para que los nuevos registros no choquen
        cur.execute("""
            SELECT table_name, column_name FROM information_schema.columns
            WHERE table_schema='public' AND column_default LIKE 'nextval(%%'
        """)
        for t, c in cur.fetchall():
            if t in tables:
                cur.execute(
                    f"SELECT setval(pg_get_serial_sequence('\"{t}\"', '{c}'), "
                    f"COALESCE((SELECT MAX(\"{c}\") FROM \"{t}\"), 1), "
                    f"(SELECT MAX(\"{c}\") FROM \"{t}\") IS NOT NULL)")
    conn.commit()


def _verify(target_conn, expected):
    with target_conn.cursor() as cur:
        bad = []
        for t, n in expected.items():
            if t in SKIP_TABLES:
                continue
            cur.execute(f'SELECT COUNT(*) FROM "{t}"')
            got = cur.fetchone()[0]
            if got != n:
                bad.append(f"{t}: esperado {n}, hay {got}")
    if bad:
        sys.exit("❌ La verificación no coincide:\n  " + "\n  ".join(bad))
    print("\n✅ Verificado: el destino tiene exactamente las mismas filas que el origen.")


def cmd_backup():
    conn = _connect("SOURCE_DATABASE_URL", readonly=True)
    try:
        data = _read_all(conn)
    finally:
        conn.close()
    data["created_at"] = datetime.utcnow().isoformat() + "Z"
    os.makedirs(BACKUP_DIR, exist_ok=True)
    path = os.path.join(BACKUP_DIR, f"blogyu_backup_{datetime.now():%Y%m%d_%H%M%S}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, default=str)
    # Comprobar que el archivo se puede volver a leer
    with open(path, encoding="utf-8") as f:
        check = json.load(f)
    if _counts(check) != _counts(data):
        sys.exit("❌ El archivo de backup no se ha guardado correctamente.")
    _print_counts("Copia de seguridad:", _counts(data))
    print(f"\n✅ Backup guardado en: {os.path.relpath(path, ROOT)} "
          f"({os.path.getsize(path) / 1024:.1f} KB)")


def cmd_copy():
    src = _connect("SOURCE_DATABASE_URL", readonly=True)
    try:
        data = _read_all(src)
    finally:
        src.close()
    _print_counts("Origen:", _counts(data))
    dst = _connect("TARGET_DATABASE_URL")
    try:
        _write(dst, data)
        _verify(dst, _counts(data))
    finally:
        dst.close()


def cmd_restore(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    _print_counts(f"Backup {os.path.basename(path)}:", _counts(data))
    dst = _connect("TARGET_DATABASE_URL")
    try:
        _write(dst, data)
        _verify(dst, _counts(data))
    finally:
        dst.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["backup"]:
        cmd_backup()
    elif args[:1] == ["copy"]:
        cmd_copy()
    elif args[:1] == ["restore"] and len(args) == 2:
        cmd_restore(args[1])
    else:
        sys.exit(__doc__)
