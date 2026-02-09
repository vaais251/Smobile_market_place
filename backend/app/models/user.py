"""
SMobile — User & Seller Profile Models
"""

import enum
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel, Column, Enum as SAEnum

if TYPE_CHECKING:
    from app.models.listing import PhoneListing
    from app.models.order import Order


# ── Enums ────────────────────────────────────
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SELLER = "SELLER"
    BUYER = "BUYER"


# ── User ─────────────────────────────────────
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    phone: str = Field(max_length=20, unique=True, index=True)
    email: Optional[str] = Field(default=None, max_length=255)
    hashed_password: str = Field(max_length=255)
    role: UserRole = Field(
        sa_column=Column(SAEnum(UserRole), nullable=False, default=UserRole.BUYER)
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────
    seller_profile: Optional["SellerProfile"] = Relationship(back_populates="user")
    listings: List["PhoneListing"] = Relationship(back_populates="seller")
    buyer_orders: List["Order"] = Relationship(
        back_populates="buyer",
        sa_relationship_kwargs={"foreign_keys": "Order.buyer_id"},
    )
    seller_orders: List["Order"] = Relationship(
        back_populates="seller_user",
        sa_relationship_kwargs={"foreign_keys": "Order.seller_id"},
    )


# ── Seller Profile ──────────────────────────
class SellerProfile(SQLModel, table=True):
    __tablename__ = "seller_profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    address: str = Field(max_length=500)
    city: str = Field(max_length=100)
    latitude: float
    longitude: float
    is_shop: bool = Field(default=False)
    shop_name: Optional[str] = Field(default=None, max_length=200)

    # ── Relationships ────────────────────────
    user: Optional[User] = Relationship(back_populates="seller_profile")
