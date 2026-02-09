"""
SMobile — Users Router

  GET  /me   → Current user profile with seller info (🔒)
  PUT  /me   → Update own profile (🔒)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas import UserDetailResponse, UserUpdate

router = APIRouter()


# ═══════════════════════════════════════════════
#  GET /me
# ═══════════════════════════════════════════════
@router.get(
    "/me",
    response_model=UserDetailResponse,
    summary="Get current user profile (🔒)",
)
def get_me(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Touch seller_profile so it appears in the response
    _ = current_user.seller_profile
    return current_user


# ═══════════════════════════════════════════════
#  PUT /me
# ═══════════════════════════════════════════════
@router.put(
    "/me",
    response_model=UserDetailResponse,
    summary="Update current user profile (🔒)",
)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    _ = current_user.seller_profile
    return current_user
