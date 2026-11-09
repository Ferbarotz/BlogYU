"""add user.email_verified (verificacion de email al registrarse)

Revision ID: d4e5f6a7b8c9
Revises: 32a097a775db
Create Date: 2026-11-09 12:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "32a097a775db"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if any(c.get("name") == "email_verified" for c in inspector.get_columns("user")):
        return
    # 1) Los usuarios que YA existen quedan verificados (server_default true),
    #    para no dejar a nadie sin poder iniciar sesión.
    op.add_column(
        "user",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # 2) A partir de ahora, las filas nuevas nacen sin verificar.
    with op.batch_alter_table("user") as batch_op:
        batch_op.alter_column("email_verified", server_default=sa.false())


def downgrade():
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("email_verified")
