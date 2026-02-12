/**
 * SMobile — Chat Store (Zustand)
 *
 * Manages chat state globally:
 *  - rooms, activeRoomId, messages
 *  - WebSocket connection lifecycle
 */

import { create } from "zustand";
import type { ChatMessage, ChatRoom } from "@/types";

interface ChatState {
    // ── State ──────────────────────
    rooms: ChatRoom[];
    activeRoomId: number | null;
    messages: ChatMessage[];
    isConnected: boolean;

    // ── Actions ────────────────────
    setRooms: (rooms: ChatRoom[]) => void;
    setActiveRoom: (roomId: number | null) => void;
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (msg: ChatMessage) => void;
    setConnected: (val: boolean) => void;
    updateUnreadCount: (roomId: number, count: number) => void;
    reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    rooms: [],
    activeRoomId: null,
    messages: [],
    isConnected: false,

    setRooms: (rooms) => set({ rooms }),

    setActiveRoom: (roomId) => set({ activeRoomId: roomId, messages: [] }),

    setMessages: (messages) => set({ messages }),

    addMessage: (msg) => {
        const { messages, activeRoomId, rooms } = get();

        // Only append if the message belongs to the active room
        if (msg.room_id === activeRoomId) {
            // Deduplicate by ID
            const exists = messages.some((m) => m.id === msg.id);
            if (!exists) {
                set({ messages: [...messages, msg] });
            }
        }

        // Update last_message on the room card
        set({
            rooms: rooms.map((r) =>
                r.id === msg.room_id
                    ? {
                        ...r,
                        last_message: {
                            content: msg.content,
                            sender_id: msg.sender_id,
                            timestamp: msg.timestamp,
                        },
                        // Increment unread if not the active room
                        unread_count:
                            msg.room_id !== activeRoomId
                                ? r.unread_count + 1
                                : r.unread_count,
                    }
                    : r
            ),
        });
    },

    setConnected: (val) => set({ isConnected: val }),

    updateUnreadCount: (roomId, count) =>
        set({
            rooms: get().rooms.map((r) =>
                r.id === roomId ? { ...r, unread_count: count } : r
            ),
        }),

    reset: () =>
        set({
            rooms: [],
            activeRoomId: null,
            messages: [],
            isConnected: false,
        }),
}));
