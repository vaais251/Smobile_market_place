"""
SMobile — Chat Models

Database models for the real-time chat system:
  ChatRoom          → A conversation context (optionally linked to an order)
  ChatParticipant   → Many-to-many link between users and rooms
  Message           → Individual chat messages within a room
"""

from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order


# ── Chat Room ────────────────────────────────
class ChatRoom(SQLModel, table=True):
    __tablename__ = "chat_rooms"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, default="Chat")
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────
    participants: List["ChatParticipant"] = Relationship(back_populates="room")
    messages: List["Message"] = Relationship(back_populates="room")


# ── Chat Participant (Many-to-Many) ──────────
class ChatParticipant(SQLModel, table=True):
    __tablename__ = "chat_participants"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    room_id: int = Field(foreign_key="chat_rooms.id", index=True)
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────
    room: Optional[ChatRoom] = Relationship(back_populates="participants")


# ── Message ──────────────────────────────────
class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: int = Field(foreign_key="chat_rooms.id", index=True)
    sender_id: int = Field(foreign_key="users.id", index=True)
    content: str = Field(max_length=2000)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_at: Optional[datetime] = Field(default=None)

    # ── Relationships ────────────────────────
    room: Optional[ChatRoom] = Relationship(back_populates="messages")
