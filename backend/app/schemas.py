"""
SMobile — Pydantic Schemas (DTOs)

Request validation and response filtering models.
Separated from SQLModel table models to keep the API layer clean.
"""

import re
from typing import Optional, List, Union

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.user import UserRole
from app.models.listing import PhoneType


# ═══════════════════════════════════════════════
#  AUTH SCHEMAS
# ═══════════════════════════════════════════════

# ── Registration ─────────────────────────────
class SellerProfileCreate(BaseModel):
    """Optional seller location data provided during registration."""
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_shop: bool = False
    shop_name: Optional[str] = None


class UserCreate(BaseModel):
    """Payload for POST /register."""
    name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str
    role: UserRole = UserRole.BUYER
    seller_profile: Optional[SellerProfileCreate] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[\s\-()]", "", v)
        if not re.match(r"^\+?\d{10,15}$", cleaned):
            raise ValueError("Phone number must be 10-15 digits, optionally starting with +.")
        return cleaned

    @model_validator(mode="after")
    def seller_must_have_profile(self):
        if self.role == UserRole.SELLER and self.seller_profile is None:
            raise ValueError("Seller registration requires seller_profile (address, city, lat/long).")
        return self


# ── Login ────────────────────────────────────
class Token(BaseModel):
    """Returned by POST /login."""
    access_token: str
    token_type: str = "bearer"


# ── User Response ────────────────────────────
class UserResponse(BaseModel):
    """Safe user representation — never exposes hashed_password."""
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: UserRole

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════
#  LISTING SCHEMAS
# ═══════════════════════════════════════════════

# ── Nested Detail Schemas ────────────────────
class OldPhoneDetailsCreate(BaseModel):
    battery_health: int       # 0-100
    battery_mah: int
    pta_approved: bool = False
    accessories: Optional[str] = None
    condition_rating: int     # 1-10
    defect_details: Optional[str] = None

    @field_validator("battery_health")
    @classmethod
    def validate_battery_health(cls, v: int) -> int:
        if not (0 <= v <= 100):
            raise ValueError("battery_health must be between 0 and 100.")
        return v

    @field_validator("condition_rating")
    @classmethod
    def validate_condition_rating(cls, v: int) -> int:
        if not (1 <= v <= 10):
            raise ValueError("condition_rating must be between 1 and 10.")
        return v


class NewPhoneDetailsCreate(BaseModel):
    processor: str
    battery_mah: int
    specs_image_url: Optional[str] = None


# ── Unified Listing Create ──────────────────
class ListingCreate(BaseModel):
    """Unified payload for POST /listings.

    - If type == OLD  →  old_phone_details is REQUIRED.
    - If type == NEW  →  new_phone_details is REQUIRED.
    - location_lat / location_long are optional; if omitted, the
      seller's SellerProfile coordinates are used automatically.
    """
    type: PhoneType
    brand: str
    model: str
    price: float
    ram: str
    storage: str
    main_image_url: str
    additional_images: Optional[List[str]] = None
    location_lat: Optional[float] = None
    location_long: Optional[float] = None

    # Nested detail objects (conditionally required)
    old_phone_details: Optional[OldPhoneDetailsCreate] = None
    new_phone_details: Optional[NewPhoneDetailsCreate] = None

    @model_validator(mode="after")
    def details_must_match_type(self):
        if self.type == PhoneType.OLD and self.old_phone_details is None:
            raise ValueError("old_phone_details is required when type is OLD.")
        if self.type == PhoneType.NEW and self.new_phone_details is None:
            raise ValueError("new_phone_details is required when type is NEW.")
        return self

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price must be non-negative.")
        return v


# ── Listing Response ────────────────────────
class OldPhoneDetailsResponse(BaseModel):
    id: int
    battery_health: int
    battery_mah: int
    pta_approved: bool
    accessories: Optional[str] = None
    condition_rating: int
    defect_details: Optional[str] = None

    model_config = {"from_attributes": True}


class NewPhoneDetailsResponse(BaseModel):
    id: int
    processor: str
    battery_mah: int
    specs_image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ListingResponse(BaseModel):
    id: int
    seller_id: int
    type: PhoneType
    brand: str
    model: str
    price: float
    ram: str
    storage: str
    main_image_url: str
    additional_images: Optional[List[str]] = None
    location_lat: float
    location_long: float
    is_active: bool
    old_phone_details: Optional[OldPhoneDetailsResponse] = None
    new_phone_details: Optional[NewPhoneDetailsResponse] = None

    model_config = {"from_attributes": True}


# ── Listing Update ──────────────────────────
class ListingUpdate(BaseModel):
    """Partial update for a phone listing. All fields optional."""
    brand: Optional[str] = None
    model: Optional[str] = None
    price: Optional[float] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    main_image_url: Optional[str] = None
    additional_images: Optional[List[str]] = None
    location_lat: Optional[float] = None
    location_long: Optional[float] = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError("Price must be non-negative.")
        return v


# ── Listing With Distance ───────────────────
class ListingWithDistanceResponse(ListingResponse):
    """ListingResponse extended with a calculated distance_km field."""
    distance_km: float


# ── Paginated Response ──────────────────────
class PaginatedListingResponse(BaseModel):
    items: List[Union[ListingWithDistanceResponse, ListingResponse]]
    total: int
    page: int
    per_page: int
    pages: int


# ═══════════════════════════════════════════════
#  ORDER SCHEMAS
# ═══════════════════════════════════════════════
from app.models.order import OrderStatus


class OrderCreate(BaseModel):
    """Payload for POST /orders — buyer places an order."""
    listing_id: int
    buyer_address: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    buyer_id: int
    listing_id: int
    seller_id: int
    status: OrderStatus
    buyer_address: Optional[str] = None
    buyer_chat_room_id: Optional[int] = None
    seller_chat_room_id: Optional[int] = None
    created_at: str  # serialised datetime

    # Enriched fields (populated by the endpoint, not the ORM directly)
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    listing_title: Optional[str] = None
    listing_image: Optional[str] = None
    listing_price: Optional[float] = None

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    """Payload for PATCH /orders/{id}/status."""
    status: OrderStatus


# ═══════════════════════════════════════════════
#  USER / PROFILE SCHEMAS
# ═══════════════════════════════════════════════

class SellerProfileResponse(BaseModel):
    id: int
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_shop: bool
    shop_name: Optional[str] = None

    model_config = {"from_attributes": True}


class UserDetailResponse(BaseModel):
    """Full user profile including seller info."""
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: UserRole
    seller_profile: Optional[SellerProfileResponse] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Partial update for the current user's profile."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None

