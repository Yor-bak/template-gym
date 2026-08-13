"""merge routines and member payments heads

Revision ID: e4a8c2d91f70
Revises: c1a2b3d4e5f6, c7f3a9e21b5d
Create Date: 2026-08-13 00:00:00.000000

"""
from typing import Sequence, Union


revision: str = "e4a8c2d91f70"
down_revision: Union[str, tuple[str, str]] = ("c1a2b3d4e5f6", "c7f3a9e21b5d")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
