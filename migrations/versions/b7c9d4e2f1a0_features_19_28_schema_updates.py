"""features 19-28 schema updates

Revision ID: b7c9d4e2f1a0
Revises: a1b2c3d4e5f6
Create Date: 2026-10-20 11:40:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = 'b7c9d4e2f1a0'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def _has_column(inspector, table_name, column_name):
    return column_name in {col['name'] for col in inspector.get_columns(table_name)}


def _has_table(inspector, table_name):
    return table_name in inspector.get_table_names()


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    # user
    if _has_table(inspector, 'user'):
        if not _has_column(inspector, 'user', 'role'):
            op.add_column('user', sa.Column('role', sa.String(length=50), nullable=True, server_default='user'))
        if not _has_column(inspector, 'user', 'created_at'):
            op.add_column('user', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))

        op.execute(sa.text('UPDATE "user" SET role = :admin_role WHERE is_admin IS TRUE').bindparams(admin_role='admin'))
        op.execute(sa.text('UPDATE "user" SET role = :user_role WHERE role IS NULL OR role = :empty').bindparams(user_role='user', empty=''))

    # post
    if _has_table(inspector, 'post'):
        if not _has_column(inspector, 'post', 'status'):
            op.add_column('post', sa.Column('status', sa.String(length=20), nullable=True, server_default='published'))
        if not _has_column(inspector, 'post', 'views'):
            op.add_column('post', sa.Column('views', sa.Integer(), nullable=True, server_default='0'))
        if not _has_column(inspector, 'post', 'is_hidden'):
            op.add_column('post', sa.Column('is_hidden', sa.Boolean(), nullable=True, server_default=sa.false()))

        op.execute(sa.text("UPDATE post SET status = 'published' WHERE status IS NULL OR status = ''"))
        op.execute(sa.text("UPDATE post SET views = 0 WHERE views IS NULL"))
        op.execute(sa.text("UPDATE post SET is_hidden = FALSE WHERE is_hidden IS NULL"))

    # likes table
    if not _has_table(inspector, 'likes'):
        op.create_table(
            'likes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('post_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['post_id'], ['post.id']),
            sa.ForeignKeyConstraint(['user_id'], ['user.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'post_id', name='uq_user_post_like'),
        )

    # notifications table + columns
    if not _has_table(inspector, 'notifications'):
        op.create_table(
            'notifications',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('related_id', sa.Integer(), nullable=False),
            sa.Column('post_id', sa.Integer(), nullable=True),
            sa.Column('actor_id', sa.Integer(), nullable=True),
            sa.Column('is_read', sa.Boolean(), nullable=True, server_default=sa.false()),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['actor_id'], ['user.id']),
            sa.ForeignKeyConstraint(['post_id'], ['post.id']),
            sa.ForeignKeyConstraint(['user_id'], ['user.id']),
            sa.PrimaryKeyConstraint('id'),
        )
    else:
        if not _has_column(inspector, 'notifications', 'post_id'):
            op.add_column('notifications', sa.Column('post_id', sa.Integer(), nullable=True))
        if not _has_column(inspector, 'notifications', 'actor_id'):
            op.add_column('notifications', sa.Column('actor_id', sa.Integer(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if _has_table(inspector, 'notifications'):
        op.drop_table('notifications')
    if _has_table(inspector, 'likes'):
        op.drop_table('likes')

    if _has_table(inspector, 'post'):
        if _has_column(inspector, 'post', 'is_hidden'):
            op.drop_column('post', 'is_hidden')
        if _has_column(inspector, 'post', 'views'):
            op.drop_column('post', 'views')
        if _has_column(inspector, 'post', 'status'):
            op.drop_column('post', 'status')

    if _has_table(inspector, 'user'):
        if _has_column(inspector, 'user', 'created_at'):
            op.drop_column('user', 'created_at')
        if _has_column(inspector, 'user', 'role'):
            op.drop_column('user', 'role')
