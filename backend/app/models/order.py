"""
SMobile — Order Model

Tracks purchases between buyers and sellers.
Includes references to auto-created chat rooms for support.
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
    SHIPPED = "SHIPPED"
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
    buyer_address: Optional[str] = Field(default=None, max_length=500)

    # Chat room references (auto-created on order placement)
    buyer_chat_room_id: Optional[int] = Field(default=None, foreign_key="chat_rooms.id")
    seller_chat_room_id: Optional[int] = Field(default=None, foreign_key="chat_rooms.id")

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
