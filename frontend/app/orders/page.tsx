"use client";

/**
 * SMobile — My Orders Page
 *
 * User-facing page showing their purchases and sales with:
 *  - Color-coded status badges
 *  - Listing image + details
 *  - "Contact Support" button linking to the order's chat room
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    ShoppingBag,
    Truck,
    CheckCircle,
    XCircle,
    MessageSquare,
    Loader2,
    Package,
    ArrowRight,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ChatWindow from "@/components/chat/ChatWindow";
import EmptyState from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/types";

// ── Status badges ───────────────────────────
const STATUS_BADGE: Record<
    OrderStatus,
    { label: string; class: string; icon: typeof ShoppingBag }
> = {
    PENDING: {
        label: "Pending",
        class: "bg-warning/15 text-warning border-warning/25",
        icon: ShoppingBag,
    },
    SHIPPED: {
        label: "Shipped",
        class: "bg-accent/15 text-accent border-accent/25",
        icon: Truck,
    },
    COMPLETED: {
        label: "Completed",
        class: "bg-success/15 text-success border-success/25",
        icon: CheckCircle,
    },
    CANCELLED: {
        label: "Cancelled",
        class: "bg-danger/15 text-danger border-danger/25",
        icon: XCircle,
    },
};

export default function MyOrdersPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chatRoomId, setChatRoomId] = useState<number | null>(null);

    // ── Auth guard ──────────────────────────
    useEffect(() => {
        if (!isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, router]);

    // ── Fetch orders ────────────────────────
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/orders");
            setOrders(res.data || []);
        } catch {
            toast.error("Failed to load orders", { description: "Please try refreshing the page." });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchOrders();
    }, [isAuthenticated, fetchOrders]);

    // ── Helpers ─────────────────────────────
    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-PK", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const isBuyer = (order: Order) => order.buyer_id === user?.id;

    const purchases = orders.filter((o) => o.buyer_id === user?.id);
    const sales = orders.filter((o) => o.seller_id === user?.id);

    if (!isAuthenticated) return null;

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
            {/* ── Page Header ─────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
                <p className="text-sm text-foreground-muted mt-1">
                    Track your purchases and sales
                </p>
            </div>

            {/* ── Chat Drawer ─────────────── */}
            {chatRoomId && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            Support Chat
                        </h3>
                        <button
                            type="button"
                            onClick={() => setChatRoomId(null)}
                            className="text-xs text-foreground-muted hover:text-foreground cursor-pointer"
                        >
                            Close chat
                        </button>
                    </div>
                    <ChatWindow roomId={chatRoomId} className="max-h-[380px]" />
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : orders.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No orders yet"
                    message="Start browsing the marketplace to find your next phone!"
                    actionLabel="Browse Phones"
                    onAction={() => router.push("/")}
                />
            ) : (
                <>
                    {/* ── Purchases Section ─────── */}
                    {purchases.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                My Purchases
                                <span className="text-xs font-normal text-foreground-muted ml-1">
                                    ({purchases.length})
                                </span>
                            </h2>
                            <div className="space-y-3">
                                {purchases.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        perspective="buyer"
                                        onChatOpen={(roomId) => setChatRoomId(roomId)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Sales Section ──────────── */}
                    {sales.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Package className="h-5 w-5 text-accent" />
                                My Sales
                                <span className="text-xs font-normal text-foreground-muted ml-1">
                                    ({sales.length})
                                </span>
                            </h2>
                            <div className="space-y-3">
                                {sales.map((order) => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        perspective="seller"
                                        onChatOpen={(roomId) => setChatRoomId(roomId)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════
//  Order Card Component
// ═══════════════════════════════════════════════
function OrderCard({
    order,
    perspective,
    onChatOpen,
}: {
    order: Order;
    perspective: "buyer" | "seller";
    onChatOpen: (roomId: number) => void;
}) {
    const badge = STATUS_BADGE[order.status];
    const BadgeIcon = badge.icon;

    const chatRoomId =
        perspective === "buyer" ? order.buyer_chat_room_id : order.seller_chat_room_id;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    return (
        <Card className="!p-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
                {/* ── Image ──────────────────── */}
                <div className="relative w-full sm:w-40 h-40 sm:h-auto bg-background-secondary overflow-hidden shrink-0">
                    {order.listing_image ? (
                        <Image
                            src={
                                order.listing_image.startsWith("http")
                                    ? order.listing_image
                                    : `${backendUrl}${order.listing_image}`
                            }
                            alt={order.listing_title || "Phone"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 160px"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Package className="h-8 w-8 text-foreground-muted/30" />
                        </div>
                    )}
                </div>

                {/* ── Content ────────────────── */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-foreground-muted">
                                    #{order.id}
                                </span>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                                        badge.class
                                    )}
                                >
                                    <BadgeIcon className="h-3 w-3" />
                                    {badge.label}
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-foreground truncate">
                                {order.listing_title || `Listing #${order.listing_id}`}
                            </h3>
                            <p className="text-sm text-foreground-muted mt-0.5">
                                {perspective === "buyer"
                                    ? `Seller: ${order.seller_name || "Unknown"}`
                                    : `Buyer: ${order.buyer_name || "Unknown"}`}
                                {" · "}
                                {new Date(order.created_at).toLocaleDateString("en-PK", {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </p>
                        </div>

                        <p className="text-lg font-bold text-foreground whitespace-nowrap">
                            Rs. {(order.listing_price || 0).toLocaleString()}
                        </p>
                    </div>

                    {/* ── Actions ─────────────── */}
                    <div className="flex items-center gap-2">
                        {chatRoomId && (
                            <button
                                type="button"
                                onClick={() => onChatOpen(chatRoomId)}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Contact Support
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
