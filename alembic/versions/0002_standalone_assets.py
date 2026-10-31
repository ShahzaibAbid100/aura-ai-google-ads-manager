"""Allow media assets before they are attached to a campaign."""

import sqlalchemy as sa
from alembic import op

revision = "0002_standalone_assets"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("campaign_assets") as batch:
        batch.alter_column("campaign_id", existing_type=sa.String(length=36), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("campaign_assets") as batch:
        batch.alter_column("campaign_id", existing_type=sa.String(length=36), nullable=False)