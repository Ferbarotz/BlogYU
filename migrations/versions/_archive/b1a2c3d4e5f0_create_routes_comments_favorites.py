"""create comment, travel_route, route_step, route_step_image, favorites tables

Revision ID: b1a2c3d4e5f0
Revises: 4f00a68d8a13
Create Date: 2026-07-30

Estas tablas se creaban históricamente solo con db.create_all(); esta migración
las añade a Alembic para que el esquema de producción sea completo. Es idempotente:
si una tabla ya existe (p.ej. en una BD de dev creada con create_all), se omite.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1a2c3d4e5f0'
down_revision = '4f00a68d8a13'
branch_labels = None
depends_on = None


def _existing_tables():
    bind = op.get_bind()
    return set(sa.inspect(bind).get_table_names())


def upgrade():
    tables = _existing_tables()

    if "comment" not in tables:
        op.create_table(
            "comment",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("author_name", sa.String(length=100), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("post_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["post_id"], ["post.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if "travel_route" not in tables:
        op.create_table(
            "travel_route",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("destination", sa.String(length=100), nullable=False),
            sa.Column("start_date", sa.String(length=50), nullable=True),
            sa.Column("budget", sa.String(length=50), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if "route_step" not in tables:
        # lat/lng se añaden en la migración siguiente (a1b2c3d4e5f6).
        op.create_table(
            "route_step",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=True),
            sa.Column("location", sa.String(length=200), nullable=True),
            sa.Column("route_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["route_id"], ["travel_route.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if "route_step_image" not in tables:
        op.create_table(
            "route_step_image",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("url", sa.String(length=512), nullable=False),
            sa.Column("step_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["step_id"], ["route_step.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    if "favorites" not in tables:
        op.create_table(
            "favorites",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("item_type", sa.String(length=50), nullable=False),
            sa.Column("item_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "item_type", "item_id", name="uq_user_item_favorite"),
        )


def downgrade():
    tables = _existing_tables()
    for name in ("route_step_image", "route_step", "travel_route", "comment", "favorites"):
        if name in tables:
            op.drop_table(name)
