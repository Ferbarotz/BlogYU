"""add missing user/post columns required by current models

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-10-20 18:05:00

"""
from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def _has_column(inspector, table_name, column_name):
    return any(col.get("name") == column_name for col in inspector.get_columns(table_name))


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # user.role
    if "user" in inspector.get_table_names() and not _has_column(inspector, "user", "role"):
        op.add_column("user", sa.Column("role", sa.String(length=50), nullable=True, server_default="user"))
        op.execute("UPDATE \"user\" SET role = 'user' WHERE role IS NULL")

    # post.status
    if "post" in inspector.get_table_names() and not _has_column(inspector, "post", "status"):
        op.add_column("post", sa.Column("status", sa.String(length=20), nullable=True, server_default="published"))
        op.execute("UPDATE post SET status = 'published' WHERE status IS NULL")

    # post.views
    if "post" in inspector.get_table_names() and not _has_column(inspector, "post", "views"):
        op.add_column("post", sa.Column("views", sa.Integer(), nullable=True, server_default="0"))
        op.execute("UPDATE post SET views = 0 WHERE views IS NULL")


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "post" in inspector.get_table_names():
        post_cols = {c.get("name") for c in inspector.get_columns("post")}
        if "views" in post_cols:
            op.drop_column("post", "views")
        if "status" in post_cols:
            op.drop_column("post", "status")

    if "user" in inspector.get_table_names():
        user_cols = {c.get("name") for c in inspector.get_columns("user")}
        if "role" in user_cols:
            op.drop_column("user", "role")
