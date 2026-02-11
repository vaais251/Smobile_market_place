"use client";

/**
 * SMobile — Navbar
 *
 * Top navigation bar with logo, links, auth buttons, and sell CTA.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Smartphone,
    Plus,
    User,
    LogOut,
    Menu,
    X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, user, logout } = useAuthStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Shrink on scroll
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    // Don't show navbar on auth pages
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
    if (isAuthPage) return null;

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full border-b transition-all duration-300",
                scrolled
                    ? "border-border bg-background/80 backdrop-blur-xl shadow-sm"
                    : "border-transparent bg-background"
            )}
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                {/* ── Logo ─────────────────────────── */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                        <Smartphone className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold text-foreground hidden sm:block">
                        SMobile
                    </span>
                </Link>

                {/* ── Desktop Nav ──────────────────── */}
                <nav className="hidden md:flex items-center gap-2">
                    {isAuthenticated ? (
                        <>
                            {/* Sell CTA */}
                            <Link href="/listings/create">
                                <Button size="sm" className="gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Sell Phone
                                </Button>
                            </Link>

                            {/* Profile */}
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground-secondary hover:text-foreground hover:bg-background-secondary transition-all"
                            >
                                <User className="h-4 w-4" />
                                <span className="max-w-[100px] truncate">{user?.name}</span>
                            </Link>

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">Get Started</Button>
                            </Link>
                        </>
                    )}
                </nav>

                {/* ── Mobile toggle ────────────────── */}
                <button
                    type="button"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex md:hidden items-center justify-center h-10 w-10 rounded-xl text-foreground-secondary hover:bg-background-secondary transition-colors cursor-pointer"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* ── Mobile menu ────────────────────── */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-2">
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/listings/create"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all"
                            >
                                <Plus className="h-4 w-4" />
                                Sell Phone
                            </Link>
                            <Link
                                href="/profile"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground-secondary hover:bg-background-secondary transition-all"
                            >
                                <User className="h-4 w-4" />
                                {user?.name}
                            </Link>
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setMobileOpen(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10 transition-all cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:bg-background-secondary transition-all text-center"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                onClick={() => setMobileOpen(false)}
                            >
                                <Button className="w-full" size="sm">
                                    Get Started
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
