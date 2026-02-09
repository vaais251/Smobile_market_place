"""
SMobile — Auth Router

POST /register  → Create a new Buyer or Seller (with optional SellerProfile).
POST /login     → OAuth2 password flow → returns JWT access token.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, SellerProfile, UserRole
from app.schemas import UserCreate, UserResponse, Token

router = APIRouter()


# ═══════════════════════════════════════════════
#  POST /register
# ═══════════════════════════════════════════════
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    """Create a new Buyer or Seller account.

    - Sellers MUST provide `seller_profile` with address, city, lat/long.
    - Returns the created user (without the hashed password).
    """

    # ── Check for duplicate phone ────────────
    existing = session.exec(
        select(User).where(User.phone == payload.phone)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this phone number already exists.",
        )

    # ── Check for duplicate email (if provided) ──
    if payload.email:
        email_exists = session.exec(
            select(User).where(User.email == payload.email)
        ).first()
        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists.",
            )

    # ── Create User ──────────────────────────
    user = User(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    session.add(user)
    session.flush()  # Get user.id before creating profile

    # ── Create SellerProfile (if Seller) ─────
    if payload.role == UserRole.SELLER and payload.seller_profile:
        profile_data = payload.seller_profile
        profile = SellerProfile(
            user_id=user.id,
            address=profile_data.address,
            city=profile_data.city,
            latitude=profile_data.latitude,
            longitude=profile_data.longitude,
            is_shop=profile_data.is_shop,
            shop_name=profile_data.shop_name,
        )
        session.add(profile)

    session.commit()
    session.refresh(user)
    return user


# ═══════════════════════════════════════════════
#  POST /login
# ═══════════════════════════════════════════════
@router.post(
    "/login",
    response_model=Token,
    summary="Login and get JWT token",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """Standard OAuth2 password flow.

    - `username` field accepts the phone number.
    - Returns a JWT access token on success.
    """

    # ── Find user by phone ───────────────────
    user = session.exec(
        select(User).where(User.phone == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Issue token ──────────────────────────
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return Token(access_token=access_token)
