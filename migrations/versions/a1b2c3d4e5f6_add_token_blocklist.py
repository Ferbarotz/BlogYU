"""add token_blocklist table

Revision ID: a1b2c3d4e5f6
Revises: 440f3ce32eef
Create Date: 2026-10-16 19:00:00

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = '440f3ce32eef'
branch_labels = None
depends_on = None


def upgrade():
    # Aditivo: solo crea la tabla si no existe (la app también la asegura al arrancar).
    bind = op.get_bind()
    if 'token_blocklist' in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        'token_blocklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_token_blocklist_jti', 'token_blocklist', ['jti'], unique=True)


def downgrade():
    op.drop_index('ix_token_blocklist_jti', table_name='token_blocklist')
    op.drop_table('token_blocklist')
