"""
SMobile — Admin Router

Protected endpoints requiring ADMIN role:
  GET    /users              → List all users
  GET    /listings           → List all listings (including inactive)
  DELETE /listings/{id}      → Force-deactivate any listing
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func

from app.core.database import get_session
from app.core.security import get_current_admin
from app.models.user import User
from app.models.listing import PhoneListing
from app.schemas import UserResponse, ListingResponse

router = APIRouter()


# ═══════════════════════════════════════════════
#  GET /users — List all users
# ═══════════════════════════════════════════════
@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="List all users (🔒 admin)",
)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(
        select(User).offset(skip).limit(limit)
    ).all()
    return users


# ═══════════════════════════════════════════════
#  GET /listings — All listings (including inactive)
# ═══════════════════════════════════════════════
@router.get(
    "/listings",
    response_model=list[ListingResponse],
    summary="List all listings incl. inactive (🔒 admin)",
)
def list_all_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    listings = session.exec(
        select(PhoneListing).order_by(PhoneListing.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return listings


# ═══════════════════════════════════════════════
#  DELETE /listings/{listing_id} — Force deactivate
# ═══════════════════════════════════════════════
@router.delete(
    "/listings/{listing_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Force-deactivate any listing (🔒 admin)",
)
def admin_delete_listing(
    listing_id: int,
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    listing = session.get(PhoneListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    listing.is_active = False
    session.add(listing)
    session.commit()
