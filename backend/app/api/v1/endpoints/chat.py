"""
SMobile — Chat Router

Real-time chat system with HTTP + WebSocket endpoints:

  GET  /rooms              → List rooms the current user belongs to
  GET  /rooms/{room_id}    → Get or create a direct-message room
  GET  /history/{room_id}  → Fetch paginated message history
  WS   /ws/{user_id}       → Real-time bidirectional messaging
"""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlmodel import Session, select, col

from app.core.database import get_session
from app.core.security import get_current_user, decode_access_token
from app.core.socket import manager
from app.models.user import User
from app.models.chat import ChatRoom, ChatParticipant, Message

router = APIRouter()


# ═══════════════════════════════════════════════
#  HTTP — List user's rooms
# ═══════════════════════════════════════════════
@router.get("/rooms", summary="List chat rooms for current user")
def list_rooms(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return all rooms the authenticated user participates in."""
    stmt = (
        select(ChatRoom)
        .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .where(ChatParticipant.user_id == current_user.id)
        .where(ChatRoom.is_active == True)  # noqa: E712
        .order_by(ChatRoom.created_at.desc())
    )
    rooms = session.exec(stmt).all()

    result = []
    for room in rooms:
        # Get other participants' names
        participants = session.exec(
            select(ChatParticipant).where(ChatParticipant.room_id == room.id)
        ).all()
        participant_ids = [p.user_id for p in participants]
        other_users = session.exec(
            select(User).where(col(User.id).in_(participant_ids))
        ).all()

        # Get last message
        last_msg = session.exec(
            select(Message)
            .where(Message.room_id == room.id)
            .order_by(Message.timestamp.desc())
            .limit(1)
        ).first()

        # Count unread
        unread = session.exec(
            select(Message)
            .where(Message.room_id == room.id)
            .where(Message.sender_id != current_user.id)
            .where(Message.read_at == None)  # noqa: E711
        ).all()

        result.append({
            "id": room.id,
            "name": room.name,
            "order_id": room.order_id,
            "is_active": room.is_active,
            "created_at": room.created_at.isoformat(),
            "participants": [
                {"id": u.id, "name": u.name, "role": u.role.value}
                for u in other_users
            ],
            "last_message": {
                "content": last_msg.content,
                "sender_id": last_msg.sender_id,
                "timestamp": last_msg.timestamp.isoformat(),
            } if last_msg else None,
            "unread_count": len(unread),
        })

    return result


# ═══════════════════════════════════════════════
#  HTTP — Get or create a DM room with another user
# ═══════════════════════════════════════════════
@router.get("/rooms/{other_user_id}", summary="Get or create DM room")
def get_or_create_room(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Find an existing DM room between current user and other_user_id,
    or create a new one."""
    if other_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a chat room with yourself.",
        )

    other_user = session.get(User, other_user_id)
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check if a room already exists between these two users
    my_rooms = session.exec(
        select(ChatParticipant.room_id).where(ChatParticipant.user_id == current_user.id)
    ).all()

    if my_rooms:
        other_rooms = session.exec(
            select(ChatParticipant.room_id)
            .where(ChatParticipant.user_id == other_user_id)
            .where(col(ChatParticipant.room_id).in_(my_rooms))
        ).all()

        if other_rooms:
            room_id = other_rooms[0]
            room = session.get(ChatRoom, room_id)
            return {"room_id": room.id, "created": False}

    # Create new room
    room = ChatRoom(name=f"{current_user.name} & {other_user.name}")
    session.add(room)
    session.flush()

    session.add(ChatParticipant(user_id=current_user.id, room_id=room.id))
    session.add(ChatParticipant(user_id=other_user_id, room_id=room.id))
    session.commit()

    return {"room_id": room.id, "created": True}


# ═══════════════════════════════════════════════
#  HTTP — Message history
# ═══════════════════════════════════════════════
@router.get("/history/{room_id}", summary="Get message history")
def get_history(
    room_id: int,
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[int] = Query(None, description="Cursor: fetch messages before this ID"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Fetch paginated message history for a room.
    The user must be a participant."""
    # Verify membership
    membership = session.exec(
        select(ChatParticipant)
        .where(ChatParticipant.room_id == room_id)
        .where(ChatParticipant.user_id == current_user.id)
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this room.")

    query = select(Message).where(Message.room_id == room_id)
    if before_id:
        query = query.where(Message.id < before_id)
    query = query.order_by(Message.timestamp.desc()).limit(limit)

    messages = session.exec(query).all()

    # Mark fetched messages as read (for messages not sent by current user)
    for msg in messages:
        if msg.sender_id != current_user.id and msg.read_at is None:
            msg.read_at = datetime.now(timezone.utc)
            session.add(msg)
    session.commit()

    # Get sender info
    sender_ids = list(set(m.sender_id for m in messages))
    senders = {}
    if sender_ids:
        users = session.exec(select(User).where(col(User.id).in_(sender_ids))).all()
        senders = {u.id: {"name": u.name, "role": u.role.value} for u in users}

    return {
        "room_id": room_id,
        "messages": [
            {
                "id": m.id,
                "room_id": m.room_id,
                "sender_id": m.sender_id,
                "sender_name": senders.get(m.sender_id, {}).get("name", "Unknown"),
                "sender_role": senders.get(m.sender_id, {}).get("role", "BUYER"),
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
                "read_at": m.read_at.isoformat() if m.read_at else None,
            }
            for m in reversed(messages)  # Return in chronological order
        ],
    }


# ═══════════════════════════════════════════════
#  WebSocket — Real-time messaging
# ═══════════════════════════════════════════════
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: Optional[str] = Query(None),
):
    """Bidirectional WebSocket for real-time chat.

    Connect with: ws://host/api/v1/chat/ws/{user_id}?token=JWT_TOKEN

    Send JSON messages:
        { "room_id": 1, "content": "Hello!" }

    Receive JSON messages:
        { "type": "message", "id": 123, "room_id": 1,
          "sender_id": 2, "sender_name": "Ali", "sender_role": "SELLER",
          "content": "Hello!", "timestamp": "...", "read_at": null }
    """
    # ── Authenticate via token query param ────
    session = next(get_session())
    try:
        if token:
            payload = decode_access_token(token)
            token_user_id = payload.get("sub")
            if token_user_id is None or int(token_user_id) != user_id:
                await websocket.close(code=4001)
                return
        else:
            # Fallback: just verify the user exists (dev mode)
            user = session.get(User, user_id)
            if not user:
                await websocket.close(code=4001)
                return

        user = session.get(User, user_id)
        if not user:
            await websocket.close(code=4001)
            return

    except Exception:
        await websocket.close(code=4001)
        return

    # ── Connect ──────────────────────────────
    await manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()

            try:
                payload = json.loads(data)
                room_id = payload.get("room_id")
                content = payload.get("content", "").strip()

                if not room_id or not content:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "room_id and content are required.",
                    })
                    continue

                # ── Verify membership ────────────
                membership = session.exec(
                    select(ChatParticipant)
                    .where(ChatParticipant.room_id == room_id)
                    .where(ChatParticipant.user_id == user_id)
                ).first()

                if not membership:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "You are not a member of this room.",
                    })
                    continue

                # ── Save message to DB ───────────
                msg = Message(
                    room_id=room_id,
                    sender_id=user_id,
                    content=content,
                )
                session.add(msg)
                session.commit()
                session.refresh(msg)

                # ── Build response payload ───────
                message_data = {
                    "type": "message",
                    "id": msg.id,
                    "room_id": msg.room_id,
                    "sender_id": msg.sender_id,
                    "sender_name": user.name,
                    "sender_role": user.role.value,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "read_at": None,
                }

                # ── Broadcast to room participants ─
                participants = session.exec(
                    select(ChatParticipant)
                    .where(ChatParticipant.room_id == room_id)
                ).all()
                participant_ids = [p.user_id for p in participants]

                await manager.broadcast_to_room(
                    message_data, participant_ids, exclude_id=None
                )

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "detail": "Invalid JSON.",
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception:
        manager.disconnect(user_id)
    finally:
        session.close()
