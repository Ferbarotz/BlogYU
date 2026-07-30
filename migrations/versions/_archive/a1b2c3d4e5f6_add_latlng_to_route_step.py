"""add lat/lng to route_step

Revision ID: a1b2c3d4e5f6
Revises: b1a2c3d4e5f0
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'b1a2c3d4e5f0'
branch_labels = None
depends_on = None


def _has_column(table, column):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    try:
        cols = [c["name"] for c in insp.get_columns(table)]
    except Exception:
        return False
    return column in cols


def upgrade():
    # La tabla route_step puede haberse creado vía db.create_all() ya con las
    # columnas; solo las añadimos si faltan (evita errores en dev SQLite).
    with op.batch_alter_table("route_step") as batch_op:
        if not _has_column("route_step", "lat"):
            batch_op.add_column(sa.Column("lat", sa.Float(), nullable=True))
        if not _has_column("route_step", "lng"):
            batch_op.add_column(sa.Column("lng", sa.Float(), nullable=True))


def downgrade():
    with op.batch_alter_table("route_step") as batch_op:
        if _has_column("route_step", "lng"):
            batch_op.drop_column("lng")
        if _has_column("route_step", "lat"):
            batch_op.drop_column("lat")
