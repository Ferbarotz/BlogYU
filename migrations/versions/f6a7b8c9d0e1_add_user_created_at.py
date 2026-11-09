"""add user.created_at (fecha de alta)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-11-09 20:00:00

Los usuarios existentes quedan con created_at = NULL (no se inventa la fecha).
"""
from alembic import op
import sqlalchemy as sa


revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade():
    existing = {c.get("name") for c in sa.inspect(op.get_bind()).get_columns("user")}
    if "created_at" not in existing:
        op.add_column("user", sa.Column("created_at", sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("created_at")
