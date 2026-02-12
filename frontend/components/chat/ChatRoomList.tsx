"use client";

/**
 * SMobile — ChatRoomList Component
 *
 * Sidebar-style list of chat rooms the user belongs to.
 * Shows room name, last message preview, unread badge.
 */

import { useEffect, useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";

import { useChatStore } from "@/store/chatStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ChatRoom } from "@/types";

interface ChatRoomListProps {
    onSelectRoom: (roomId: number) => void;
    className?: string;
}

export default function ChatRoomList({
    onSelectRoom,
    className,
}: ChatRoomListProps) {
    const { rooms, setRooms, activeRoomId } = useChatStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        api.get("/chat/rooms")
            .then((res) => {
                setRooms(res.data || []);
            })
            .catch((err) => {
                console.error("Failed to load rooms:", err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [setRooms]);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday
            ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center py-10", className)}>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-10 text-foreground-muted", className)}>
                <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-sm">No conversations yet</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-1", className)}>
            {rooms.map((room) => (
                <button
                    key={room.id}
                    type="button"
                    onClick={() => onSelectRoom(room.id)}
                    className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer",
                        activeRoomId === room.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-background-secondary border border-transparent"
                    )}
                >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquare className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-foreground truncate">
                                {room.name}
                            </span>
                            {room.last_message && (
                                <span className="text-[10px] text-foreground-muted shrink-0">
                                    {formatTime(room.last_message.timestamp)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-foreground-muted truncate">
                                {room.last_message
                                    ? room.last_message.content
                                    : "No messages yet"}
                            </p>
                            {room.unread_count > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5 shrink-0">
                                    {room.unread_count > 99
                                        ? "99+"
                                        : room.unread_count}
                                </span>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
