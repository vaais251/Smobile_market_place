"""
SMobile — Order Model
"""

import enum
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel, Column, Enum as SAEnum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.listing import PhoneListing


# ── Enums ────────────────────────────────────
class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ── Order ────────────────────────────────────
class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    buyer_id: int = Field(foreign_key="users.id", index=True)
    listing_id: int = Field(foreign_key="phone_listings.id", index=True)
    seller_id: int = Field(foreign_key="users.id", index=True)
    status: OrderStatus = Field(
        sa_column=Column(SAEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────
    buyer: Optional["User"] = Relationship(
        back_populates="buyer_orders",
        sa_relationship_kwargs={"foreign_keys": "[Order.buyer_id]"},
    )
    seller_user: Optional["User"] = Relationship(
        back_populates="seller_orders",
        sa_relationship_kwargs={"foreign_keys": "[Order.seller_id]"},
    )
    listing: Optional["PhoneListing"] = Relationship(back_populates="orders")
