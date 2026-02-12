"""
SMobile — Orders Router

Full order lifecycle with automatic chat room creation:

  POST   /               → Place an order (🔒 buyer)
  GET    /               → List orders (admin sees all, users see their own)
  GET    /{id}           → Single order detail (🔒 buyer / seller / admin)
  PATCH  /{id}/status    → Update status (🔒 admin only)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, col

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.listing import PhoneListing
from app.models.order import Order, OrderStatus
from app.models.chat import ChatRoom, ChatParticipant, Message
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate

router = APIRouter()


# ── Helper: enrich an Order with buyer/seller/listing info ──
def _enrich_order(order: Order, session: Session) -> dict:
    """Build a dict matching OrderResponse with enriched fields."""
    buyer = session.get(User, order.buyer_id)
    seller = session.get(User, order.seller_id)
    listing = session.get(PhoneListing, order.listing_id)

    return {
        "id": order.id,
        "buyer_id": order.buyer_id,
        "listing_id": order.listing_id,
        "seller_id": order.seller_id,
        "status": order.status,
        "buyer_address": order.buyer_address,
        "buyer_chat_room_id": order.buyer_chat_room_id,
        "seller_chat_room_id": order.seller_chat_room_id,
        "created_at": order.created_at.isoformat() if order.created_at else "",
        "buyer_name": buyer.name if buyer else None,
        "seller_name": seller.name if seller else None,
        "listing_title": f"{listing.brand} {listing.model}" if listing else None,
        "listing_image": listing.main_image_url if listing else None,
        "listing_price": listing.price if listing else None,
    }


# ── Helper: find any admin user ─────────────
def _get_admin_user(session: Session) -> Optional[User]:
    """Return the first admin user in the system."""
    return session.exec(
        select(User).where(User.role == UserRole.ADMIN).limit(1)
    ).first()


# ── Helper: create a chat room with participants + system msg ─
def _create_order_chat_room(
    session: Session,
    name: str,
    order_id: int,
    participant_ids: List[int],
    system_message: str,
) -> ChatRoom:
    """Create a ChatRoom, add participants, and post a system message."""
    room = ChatRoom(name=name, order_id=order_id)
    session.add(room)
    session.flush()  # Get the room.id

    for uid in participant_ids:
        session.add(ChatParticipant(user_id=uid, room_id=room.id))

    # System message from the first participant (admin if available)
    admin = _get_admin_user(session)
    sender_id = admin.id if admin else participant_ids[0]

    session.add(Message(
        room_id=room.id,
        sender_id=sender_id,
        content=system_message,
    ))

    return room


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
        buyer_address=payload.buyer_address,
    )
    session.add(order)
    session.flush()  # Get the order.id before creating chat rooms

    # ── Mark listing as reserved ─────────────
    listing.is_active = False
    session.add(listing)

    # ── Auto-create chat rooms ───────────────
    admin = _get_admin_user(session)
    admin_id = admin.id if admin else current_user.id

    # Room A: Buyer ↔ Admin (Buyer Support)
    buyer_room = _create_order_chat_room(
        session=session,
        name=f"Order #{order.id}: Buyer Support",
        order_id=order.id,
        participant_ids=[current_user.id, admin_id],
        system_message=f"Order #{order.id} created. An agent will be with you shortly.",
    )

    # Room B: Seller ↔ Admin (Seller Coordination)
    seller_room = _create_order_chat_room(
        session=session,
        name=f"Order #{order.id}: Seller Coordination",
        order_id=order.id,
        participant_ids=[listing.seller_id, admin_id],
        system_message=f"Order #{order.id} created for your listing \"{listing.brand} {listing.model}\". An agent will coordinate with you.",
    )

    # Link rooms to the order
    order.buyer_chat_room_id = buyer_room.id
    order.seller_chat_room_id = seller_room.id
    session.add(order)

    session.commit()
    session.refresh(order)

    return _enrich_order(order, session)


# ═══════════════════════════════════════════════
#  GET / — List orders
# ═══════════════════════════════════════════════
@router.get(
    "/",
    response_model=List[OrderResponse],
    summary="List orders (🔒)",
)
def list_orders(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Admin sees ALL orders. Regular users see orders where they are buyer or seller."""
    if current_user.role == UserRole.ADMIN:
        query = select(Order)
    else:
        query = select(Order).where(
            (Order.buyer_id == current_user.id) | (Order.seller_id == current_user.id)
        )

    orders = session.exec(query.order_by(Order.created_at.desc())).all()
    return [_enrich_order(o, session) for o in orders]


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

    return _enrich_order(order, session)


# ═══════════════════════════════════════════════
#  PATCH /{order_id}/status — Admin-only update
# ═══════════════════════════════════════════════
@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Update order status (🔒 admin only)",
)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Admin only
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update order status.")

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    # Validate status transitions
    valid_transitions = {
        OrderStatus.PENDING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
        OrderStatus.COMPLETED: set(),       # terminal
        OrderStatus.CANCELLED: set(),       # terminal
    }
    if payload.status not in valid_transitions.get(order.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status.value} to {payload.status.value}.",
        )

    order.status = payload.status
    session.add(order)

    # If cancelled, re-activate the listing
    if payload.status == OrderStatus.CANCELLED:
        listing = session.get(PhoneListing, order.listing_id)
        if listing:
            listing.is_active = True
            session.add(listing)

    session.commit()
    session.refresh(order)
    return _enrich_order(order, session)
