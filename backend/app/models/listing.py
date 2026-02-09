"""
SMobile — Phone Listing, OldPhoneDetails & NewPhoneDetails Models
"""

import enum
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel, Column, JSON, Enum as SAEnum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order


# ── Enums ────────────────────────────────────
class PhoneType(str, enum.Enum):
    NEW = "NEW"
    OLD = "OLD"


# ── Phone Listing ────────────────────────────
class PhoneListing(SQLModel, table=True):
    __tablename__ = "phone_listings"

    id: Optional[int] = Field(default=None, primary_key=True)
    seller_id: int = Field(foreign_key="users.id", index=True)

    type: PhoneType = Field(
        sa_column=Column(SAEnum(PhoneType), nullable=False)
    )
    brand: str = Field(max_length=100, index=True)
    model: str = Field(max_length=200)
    price: float = Field(ge=0)
    ram: str = Field(max_length=50)           # e.g. "8GB"
    storage: str = Field(max_length=50)       # e.g. "128GB"
    main_image_url: str = Field(max_length=500)
    additional_images: Optional[List[str]] = Field(
        default=None, sa_column=Column(JSON)
    )
    location_lat: float
    location_long: float
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────
    seller: Optional["User"] = Relationship(back_populates="listings")
    old_phone_details: Optional["OldPhoneDetails"] = Relationship(back_populates="listing")
    new_phone_details: Optional["NewPhoneDetails"] = Relationship(back_populates="listing")
    orders: List["Order"] = Relationship(back_populates="listing")


# ── Old Phone Details ────────────────────────
class OldPhoneDetails(SQLModel, table=True):
    __tablename__ = "old_phone_details"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="phone_listings.id", unique=True, index=True)

    battery_health: int = Field(ge=0, le=100)       # percentage 0-100
    battery_mah: int = Field(ge=0)
    pta_approved: bool = Field(default=False)
    accessories: Optional[str] = Field(default=None)  # free-text description
    condition_rating: int = Field(ge=1, le=10)         # 1 (poor) → 10 (mint)
    defect_details: Optional[str] = Field(default=None)

    # ── Relationships ────────────────────────
    listing: Optional[PhoneListing] = Relationship(back_populates="old_phone_details")


# ── New Phone Details ────────────────────────
class NewPhoneDetails(SQLModel, table=True):
    __tablename__ = "new_phone_details"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="phone_listings.id", unique=True, index=True)

    processor: str = Field(max_length=200)
    battery_mah: int = Field(ge=0)
    specs_image_url: Optional[str] = Field(default=None, max_length=500)

    # ── Relationships ────────────────────────
    listing: Optional[PhoneListing] = Relationship(back_populates="new_phone_details")
