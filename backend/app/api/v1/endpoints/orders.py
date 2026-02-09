"""
SMobile — Orders Router

  POST   /                → Place an order (🔒 buyer)
  GET    /                → My orders (🔒 buyer sees purchases, seller sees sales)
  GET    /{id}            → Single order detail (🔒 buyer or seller)
  PATCH  /{id}/status     → Update order status (🔒 seller / admin)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.listing import PhoneListing
from app.models.order import Order, OrderStatus
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate

router = APIRouter()


# ═══════════════════════════════════════════════
#  POST / — Place an order
# ═══════════════════════════════════════════════
@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Place an order on a listing (🔒)",
)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # ── Validate listing ─────────────────────
    listing = session.get(PhoneListing, payload.listing_id)
    if not listing or not listing.is_active:
        raise HTTPException(status_code=404, detail="Listing not found or no longer active.")

    # Buyer cannot order their own listing
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot place an order on your own listing.",
        )

    # Prevent duplicate pending orders
    existing = session.exec(
        select(Order).where(
            Order.buyer_id == current_user.id,
            Order.listing_id == payload.listing_id,
            Order.status == OrderStatus.PENDING,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending order for this listing.",
        )

    # ── Create order ─────────────────────────
    order = Order(
        buyer_id=current_user.id,
        listing_id=listing.id,
        seller_id=listing.seller_id,
        status=OrderStatus.PENDING,
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ═══════════════════════════════════════════════
#  GET / — My orders
# ═══════════════════════════════════════════════
@router.get(
    "/",
    response_model=list[OrderResponse],
    summary="List my orders (🔒)",
)
def list_orders(
    role_view: str = Query("buyer", regex="^(buyer|seller)$",
                           description="View as 'buyer' (purchases) or 'seller' (sales)"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if role_view == "seller":
        query = select(Order).where(Order.seller_id == current_user.id)
    else:
        query = select(Order).where(Order.buyer_id == current_user.id)

    orders = session.exec(query.order_by(Order.created_at.desc())).all()
    return orders


# ═══════════════════════════════════════════════
#  GET /{order_id} — Single order
# ═══════════════════════════════════════════════
@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get single order detail (🔒)",
)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Only buyer, seller, or admin can view
    if (
        order.buyer_id != current_user.id
        and order.seller_id != current_user.id
        and current_user.role != UserRole.ADMIN
    ):
        raise HTTPException(status_code=403, detail="Access denied.")

    return order


# ═══════════════════════════════════════════════
#  PATCH /{order_id}/status
# ═══════════════════════════════════════════════
@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Update order status (🔒 seller/admin)",
)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Only the seller of this order or an admin can update status
    if order.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the seller or admin can update order status.")

    # Validate status transitions
    valid_transitions = {
        OrderStatus.PENDING: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
        OrderStatus.COMPLETED: set(),       # terminal state
        OrderStatus.CANCELLED: set(),       # terminal state
    }
    if payload.status not in valid_transitions.get(order.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status.value} to {payload.status.value}.",
        )

    order.status = payload.status
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
