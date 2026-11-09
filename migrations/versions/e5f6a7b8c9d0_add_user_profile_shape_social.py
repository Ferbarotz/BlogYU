"""add user.profile_shape y redes sociales (social_*)

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-11-09 18:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

_COLUMNS = [
    ("profile_shape", 20),
    ("social_twitter", 255),
    ("social_instagram", 255),
    ("social_tiktok", 255),
    ("social_facebook", 255),
    ("social_website", 255),
]


def upgrade():
    existing = {c.get("name") for c in sa.inspect(op.get_bind()).get_columns("user")}
    for name, length in _COLUMNS:
        if name not in existing:
            op.add_column("user", sa.Column(name, sa.String(length=length), nullable=True))


def downgrade():
    with op.batch_alter_table("user") as batch_op:
        for name, _ in reversed(_COLUMNS):
            batch_op.drop_column(name)
