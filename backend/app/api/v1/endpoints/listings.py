"""
SMobile — Listings Router

Full CRUD for phone listings:
  POST   /              → Create (🔒 auth)
  GET    /              → List all active listings (public, with filters)
  GET    /{id}          → Single listing detail (public)
  PUT    /{id}          → Update own listing (🔒 owner only)
  DELETE /{id}          → Soft-delete own listing (🔒 owner only)
"""

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, col

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User, SellerProfile
from app.models.listing import PhoneListing, OldPhoneDetails, NewPhoneDetails, PhoneType
from app.schemas import (
    ListingCreate,
    ListingUpdate,
    ListingResponse,
    PaginatedListingResponse,
)

router = APIRouter()


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────
def _load_details(listing: PhoneListing):
    """Touch lazy-loaded relationships so they appear in the response."""
    if listing.type == PhoneType.OLD:
        _ = listing.old_phone_details
    elif listing.type == PhoneType.NEW:
        _ = listing.new_phone_details


# ═══════════════════════════════════════════════
#  POST /
# ═══════════════════════════════════════════════
@router.post(
    "/",
    response_model=ListingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new phone listing",
)
def create_listing(
    payload: ListingCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # ── Resolve location ─────────────────────
    lat = payload.location_lat
    lng = payload.location_long

    if lat is None or lng is None:
        profile = session.exec(
            select(SellerProfile).where(SellerProfile.user_id == current_user.id)
        ).first()
        if profile:
            lat = lat or profile.latitude
            lng = lng or profile.longitude
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="location_lat and location_long are required. "
                       "Set them in the request or create a SellerProfile first.",
            )

    # ── Create listing ───────────────────────
    listing = PhoneListing(
        seller_id=current_user.id,
        type=payload.type,
        brand=payload.brand,
        model=payload.model,
        price=payload.price,
        ram=payload.ram,
        storage=payload.storage,
        main_image_url=payload.main_image_url,
        additional_images=payload.additional_images,
        location_lat=lat,
        location_long=lng,
    )
    session.add(listing)
    session.flush()

    # ── Type-specific details ────────────────
    if payload.type == PhoneType.OLD and payload.old_phone_details:
        d = payload.old_phone_details
        session.add(OldPhoneDetails(
            listing_id=listing.id,
            battery_health=d.battery_health,
            battery_mah=d.battery_mah,
            pta_approved=d.pta_approved,
            accessories=d.accessories,
            condition_rating=d.condition_rating,
            defect_details=d.defect_details,
        ))
    elif payload.type == PhoneType.NEW and payload.new_phone_details:
        d = payload.new_phone_details
        session.add(NewPhoneDetails(
            listing_id=listing.id,
            processor=d.processor,
            battery_mah=d.battery_mah,
            specs_image_url=d.specs_image_url,
        ))

    session.commit()
    session.refresh(listing)
    _load_details(listing)
    return listing


# ═══════════════════════════════════════════════
#  GET / — List with filters & pagination
# ═══════════════════════════════════════════════
@router.get(
    "/",
    response_model=PaginatedListingResponse,
    summary="List active listings (public)",
)
def list_listings(
    # Filters
    brand: Optional[str] = Query(None, description="Filter by brand (case-insensitive)"),
    type: Optional[PhoneType] = Query(None, description="Filter by NEW or OLD"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    city: Optional[str] = Query(None, description="Filter by seller city"),
    search: Optional[str] = Query(None, description="Search brand or model"),
    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = select(PhoneListing).where(PhoneListing.is_active == True)  # noqa: E712

    # ── Apply filters ────────────────────────
    if brand:
        query = query.where(func.lower(PhoneListing.brand) == brand.lower())
    if type:
        query = query.where(PhoneListing.type == type)
    if min_price is not None:
        query = query.where(PhoneListing.price >= min_price)
    if max_price is not None:
        query = query.where(PhoneListing.price <= max_price)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            col(PhoneListing.brand).ilike(pattern) | col(PhoneListing.model).ilike(pattern)
        )
    if city:
        # Join to seller → seller_profile to filter by city
        query = (
            query
            .join(User, PhoneListing.seller_id == User.id)
            .join(SellerProfile, SellerProfile.user_id == User.id)
            .where(func.lower(SellerProfile.city) == city.lower())
        )

    # ── Count total ──────────────────────────
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # ── Paginate ─────────────────────────────
    offset = (page - 1) * per_page
    items = session.exec(
        query.order_by(PhoneListing.created_at.desc()).offset(offset).limit(per_page)
    ).all()

    for item in items:
        _load_details(item)

    return PaginatedListingResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 0,
    )


# ═══════════════════════════════════════════════
#  GET /{listing_id} — Single listing
# ═══════════════════════════════════════════════
@router.get(
    "/{listing_id}",
    response_model=ListingResponse,
    summary="Get a single listing (public)",
)
def get_listing(listing_id: int, session: Session = Depends(get_session)):
    listing = session.get(PhoneListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    _load_details(listing)
    return listing


# ═══════════════════════════════════════════════
#  PUT /{listing_id} — Update own listing
# ═══════════════════════════════════════════════
@router.put(
    "/{listing_id}",
    response_model=ListingResponse,
    summary="Update own listing (🔒)",
)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(PhoneListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own listings.")

    # Apply partial updates
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(listing, key, value)

    session.add(listing)
    session.commit()
    session.refresh(listing)
    _load_details(listing)
    return listing


# ═══════════════════════════════════════════════
#  DELETE /{listing_id} — Soft-delete
# ═══════════════════════════════════════════════
@router.delete(
    "/{listing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate own listing (🔒)",
)
def delete_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    listing = session.get(PhoneListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own listings.")

    listing.is_active = False
    session.add(listing)
    session.commit()
