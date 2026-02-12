"use client";

/**
 * SMobile — Admin Dashboard
 *
 * Protected admin page with:
 *  - Stats cards (Total Orders, Active Listings, Revenue)
 *  - Orders table with status updates and chat actions
 *  - Sidebar navigation (Orders, Listings, Users)
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ShoppingBag,
    Package,
    DollarSign,
    MessageSquare,
    Truck,
    CheckCircle,
    XCircle,
    Users,
    LayoutDashboard,
    ChevronRight,
    Loader2,
    ArrowUpRight,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Order, OrderStatus } from "@/types";

// ── Status config ───────────────────────────
const STATUS_CONFIG: Record<
    OrderStatus,
    { label: string; color: string; bg: string; icon: typeof ShoppingBag }
> = {
    PENDING: {
        label: "Pending",
        color: "text-warning",
        bg: "bg-warning/10",
        icon: ShoppingBag,
    },
    SHIPPED: {
        label: "Shipped",
        color: "text-accent",
        bg: "bg-accent/10",
        icon: Truck,
    },
    COMPLETED: {
        label: "Completed",
        color: "text-success",
        bg: "bg-success/10",
        icon: CheckCircle,
    },
    CANCELLED: {
        label: "Cancelled",
        color: "text-danger",
        bg: "bg-danger/10",
        icon: XCircle,
    },
};

type SidebarTab = "orders" | "listings" | "users";

export default function AdminDashboard() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();

    const [activeTab, setActiveTab] = useState<SidebarTab>("orders");
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [chatRoomId, setChatRoomId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ── Auth guard ──────────────────────────
    useEffect(() => {
        if (!isAuthenticated || user?.role !== "ADMIN") {
            router.replace("/login");
        }
    }, [isAuthenticated, user, router]);

    // ── Fetch orders ────────────────────────
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get("/orders");
            setOrders(res.data || []);
        } catch {
            setError("Failed to load orders.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user?.role === "ADMIN") {
            fetchOrders();
        }
    }, [isAuthenticated, user, fetchOrders]);

    // ── Update status ───────────────────────
    const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
        setUpdatingId(orderId);
        try {
            await api.patch(`/orders/${orderId}/status`, { status: newStatus });
            fetchOrders();
        } catch (err: any) {
            toast.error("Update failed", { description: err.response?.data?.detail || "Failed to update status." });
        } finally {
            setUpdatingId(null);
        }
    };

    // ── Stats ───────────────────────────────
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;
    const revenue = orders
        .filter((o) => o.status === "COMPLETED")
        .reduce((sum, o) => sum + (o.listing_price || 0), 0);

    // ── Format date ─────────────────────────
    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-PK", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (!isAuthenticated || user?.role !== "ADMIN") return null;

    return (
        <div className="flex min-h-screen">
            {/* ═══ SIDEBAR ════════════════════ */}
            <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-background-card/50 px-4 py-6">
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                        Admin Panel
                    </h2>
                    <p className="text-xs text-foreground-muted mt-1">
                        Manage your marketplace
                    </p>
                </div>

                <nav className="space-y-1">
                    {[
                        { id: "orders" as const, label: "Orders", icon: ShoppingBag, count: pendingOrders },
                        { id: "listings" as const, label: "Listings", icon: Package },
                        { id: "users" as const, label: "Users", icon: Users },
                    ].map(({ id, label, icon: Icon, count }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => { setActiveTab(id); setChatRoomId(null); }}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                                activeTab === id
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1 text-left">{label}</span>
                            {count != null && count > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white px-1.5">
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* ═══ MAIN CONTENT ═══════════════ */}
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Mobile tab bar */}
                <div className="lg:hidden flex gap-2 overflow-x-auto pb-2">
                    {(["orders", "listings", "users"] as SidebarTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => { setActiveTab(tab); setChatRoomId(null); }}
                            className={cn(
                                "rounded-xl px-4 py-2 text-sm font-medium capitalize whitespace-nowrap transition-all cursor-pointer",
                                activeTab === tab
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-background-secondary text-foreground-secondary"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ── Stats Cards ─────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
                        { label: "Pending", value: pendingOrders, icon: Truck, color: "text-warning" },
                        { label: "Completed", value: completedOrders, icon: CheckCircle, color: "text-success" },
                        { label: "Revenue", value: `Rs. ${revenue.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <Card key={label} className="!p-4 flex items-center gap-4">
                            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-background-secondary", color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-foreground-muted">{label}</p>
                                <p className="text-xl font-bold text-foreground">{value}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* ── Chat Drawer ─────────────── */}
                {chatRoomId && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Live Chat</h3>
                            <button
                                type="button"
                                onClick={() => setChatRoomId(null)}
                                className="text-xs text-foreground-muted hover:text-foreground cursor-pointer"
                            >
                                Close chat
                            </button>
                        </div>
                        <ChatWindow roomId={chatRoomId} className="max-h-[420px]" />
                    </div>
                )}

                {/* ── Orders Tab ──────────────── */}
                {activeTab === "orders" && (
                    <div>
                        <h2 className="text-lg font-bold text-foreground mb-4">
                            All Orders
                        </h2>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <Card className="!p-6 text-center text-danger">{error}</Card>
                        ) : orders.length === 0 ? (
                            <Card className="!p-10 text-center">
                                <ShoppingBag className="h-10 w-10 mx-auto text-foreground-muted/30 mb-3" />
                                <p className="text-foreground-muted">No orders yet.</p>
                            </Card>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-background-secondary/50">
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Date</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Listing</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Buyer</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Seller</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Price</th>
                                            <th className="px-4 py-3 text-left font-semibold text-foreground-secondary">Status</th>
                                            <th className="px-4 py-3 text-right font-semibold text-foreground-secondary">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => {
                                            const cfg = STATUS_CONFIG[order.status];
                                            const StatusIcon = cfg.icon;
                                            const isUpdating = updatingId === order.id;

                                            return (
                                                <tr
                                                    key={order.id}
                                                    className="border-b border-border/50 hover:bg-background-secondary/30 transition-colors"
                                                >
                                                    <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                                                        #{order.id}
                                                    </td>
                                                    <td className="px-4 py-3 text-foreground-secondary">
                                                        {formatDate(order.created_at)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-foreground font-medium truncate max-w-[150px] block">
                                                            {order.listing_title || `Listing #${order.listing_id}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-foreground-secondary">
                                                        {order.buyer_name || `User #${order.buyer_id}`}
                                                    </td>
                                                    <td className="px-4 py-3 text-foreground-secondary">
                                                        {order.seller_name || `User #${order.seller_id}`}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-foreground">
                                                        Rs. {(order.listing_price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
                                                                cfg.bg,
                                                                cfg.color
                                                            )}
                                                        >
                                                            <StatusIcon className="h-3 w-3" />
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                            {/* Chat Buyer */}
                                                            {order.buyer_chat_room_id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setChatRoomId(order.buyer_chat_room_id!)}
                                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
                                                                    title="Chat with buyer"
                                                                >
                                                                    <MessageSquare className="h-3 w-3" />
                                                                    Buyer
                                                                </button>
                                                            )}
                                                            {/* Chat Seller */}
                                                            {order.seller_chat_room_id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setChatRoomId(order.seller_chat_room_id!)}
                                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 transition-all cursor-pointer"
                                                                    title="Chat with seller"
                                                                >
                                                                    <MessageSquare className="h-3 w-3" />
                                                                    Seller
                                                                </button>
                                                            )}
                                                            {/* Status actions */}
                                                            {order.status === "PENDING" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdating}
                                                                    onClick={() => handleStatusUpdate(order.id, "SHIPPED")}
                                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 transition-all disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    <Truck className="h-3 w-3" />
                                                                    Ship
                                                                </button>
                                                            )}
                                                            {order.status === "SHIPPED" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdating}
                                                                    onClick={() => handleStatusUpdate(order.id, "COMPLETED")}
                                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-all disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    Complete
                                                                </button>
                                                            )}
                                                            {(order.status === "PENDING" || order.status === "SHIPPED") && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdating}
                                                                    onClick={() => handleStatusUpdate(order.id, "CANCELLED")}
                                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 transition-all disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    <XCircle className="h-3 w-3" />
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Listings Tab (placeholder) ── */}
                {activeTab === "listings" && (
                    <Card className="!p-10 text-center">
                        <Package className="h-10 w-10 mx-auto text-foreground-muted/30 mb-3" />
                        <p className="text-foreground-secondary font-medium">
                            Listing management coming soon.
                        </p>
                    </Card>
                )}

                {/* ── Users Tab (placeholder) ──── */}
                {activeTab === "users" && (
                    <Card className="!p-10 text-center">
                        <Users className="h-10 w-10 mx-auto text-foreground-muted/30 mb-3" />
                        <p className="text-foreground-secondary font-medium">
                            User management coming soon.
                        </p>
                    </Card>
                )}
            </main>
        </div>
    );
}
