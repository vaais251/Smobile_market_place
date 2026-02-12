"""
SMobile — WebSocket Connection Manager

Manages active WebSocket connections keyed by user ID.
Provides helpers for connecting, disconnecting, and
pushing messages to specific users in real-time.
"""

import json
from typing import Dict, List, Optional

from fastapi import WebSocket


class ConnectionManager:
    """In-memory WebSocket connection pool.

    Maps user_id → WebSocket so we can push messages
    to specific users instantly.
    """

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept the WebSocket handshake and register the user."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        """Remove a user from the active pool."""
        self.active_connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        """Check if a user currently has an open socket."""
        return user_id in self.active_connections

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a JSON message to a specific user if they are online."""
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                # Socket broken — remove silently
                self.disconnect(user_id)

    async def broadcast_to_room(
        self, message: dict, participant_ids: List[int], exclude_id: Optional[int] = None
    ):
        """Send a message to all online participants of a room."""
        for uid in participant_ids:
            if uid != exclude_id:
                await self.send_personal_message(message, uid)


# Singleton instance shared across the application
manager = ConnectionManager()
