"use client";

/**
 * SMobile — ChatWindow Component
 *
 * Full-featured chat UI:
 *  - Connects to WebSocket on mount
 *  - Loads message history via REST
 *  - Scrolls to bottom on new messages
 *  - Color-coded bubbles: mine (right/primary), theirs (left/gray), admin (gold border)
 */

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type FormEvent,
} from "react";
import { Send, Loader2, Wifi, WifiOff, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface ChatWindowProps {
    roomId: number;
    className?: string;
}

export default function ChatWindow({ roomId, className }: ChatWindowProps) {
    const { user, token } = useAuthStore();
    const {
        messages,
        setMessages,
        addMessage,
        setActiveRoom,
        isConnected,
        setConnected,
    } = useChatStore();

    const [input, setInput] = useState("");
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const wsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Scroll to bottom ────────────────────
    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
            });
        });
    }, []);

    // ── Set active room ─────────────────────
    useEffect(() => {
        setActiveRoom(roomId);
        return () => setActiveRoom(null);
    }, [roomId, setActiveRoom]);

    // ── Load history ────────────────────────
    useEffect(() => {
        if (!roomId) return;
        setIsLoadingHistory(true);

        api.get(`/chat/history/${roomId}?limit=100`)
            .then((res) => {
                setMessages(res.data.messages || []);
                setTimeout(scrollToBottom, 100);
            })
            .catch((err) => {
                console.error("Failed to load chat history:", err);
            })
            .finally(() => {
                setIsLoadingHistory(false);
            });
    }, [roomId, setMessages, scrollToBottom]);

    // ── WebSocket connection ────────────────
    useEffect(() => {
        if (!user?.id) return;

        const backendBase =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const wsBase = backendBase.replace(/^http/, "ws");
        const wsUrl = `${wsBase}/api/v1/chat/ws/${user.id}${token ? `?token=${token}` : ""}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "message") {
                    addMessage(data as ChatMessage);
                    scrollToBottom();
                }
            } catch {
                // ignore malformed messages
            }
        };

        ws.onclose = () => {
            setConnected(false);
        };

        ws.onerror = () => {
            setConnected(false);
        };

        return () => {
            ws.close();
            setConnected(false);
        };
    }, [user?.id, token, addMessage, setConnected, scrollToBottom]);

    // ── Auto-scroll on new messages ─────────
    useEffect(() => {
        scrollToBottom();
    }, [messages.length, scrollToBottom]);

    // ── Send message ────────────────────────
    const handleSend = (e: FormEvent) => {
        e.preventDefault();
        const content = input.trim();
        if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
            return;

        wsRef.current.send(
            JSON.stringify({ room_id: roomId, content })
        );
        setInput("");
        inputRef.current?.focus();
    };

    // ── Format timestamp ────────────────────
    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const myId = user?.id;

    return (
        <div
            className={cn(
                "flex flex-col rounded-2xl border border-border bg-background-card/70 backdrop-blur-xl shadow-xl overflow-hidden",
                className
            )}
        >
            {/* ── Header ──────────────────── */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                    Chat
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                    {isConnected ? (
                        <span className="flex items-center gap-1 text-success">
                            <Wifi className="h-3 w-3" />
                            Live
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-foreground-muted">
                            <WifiOff className="h-3 w-3" />
                            Offline
                        </span>
                    )}
                </div>
            </div>

            {/* ── Messages ────────────────── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{ minHeight: 300, maxHeight: 500 }}
            >
                {isLoadingHistory && (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                )}

                {!isLoadingHistory && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-foreground-muted">
                        <Send className="h-8 w-8 opacity-30 mb-2" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMine = msg.sender_id === myId;
                    const isAdmin = msg.sender_role === "ADMIN";

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col max-w-[80%]",
                                isMine ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            {/* Sender name (only for others) */}
                            {!isMine && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-[10px] font-medium text-foreground-muted">
                                        {msg.sender_name}
                                    </span>
                                    {isAdmin && (
                                        <ShieldCheck className="h-3 w-3 text-warning" />
                                    )}
                                </div>
                            )}

                            {/* Bubble */}
                            <div
                                className={cn(
                                    "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                                    isMine
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-background-secondary text-foreground rounded-bl-md",
                                    isAdmin && !isMine && "border-2 border-warning/60 bg-warning/5"
                                )}
                            >
                                {msg.content}
                            </div>

                            {/* Timestamp + read receipt */}
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-foreground-muted/60">
                                    {formatTime(msg.timestamp)}
                                </span>
                                {isMine && msg.read_at && (
                                    <span className="text-[10px] text-success">✓✓</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Input ───────────────────── */}
            <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…"
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                    disabled={!isConnected}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || !isConnected}
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer",
                        input.trim() && isConnected
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                            : "bg-background-secondary text-foreground-muted cursor-not-allowed"
                    )}
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
