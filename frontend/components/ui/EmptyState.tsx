"use client";

/**
 * SMobile — EmptyState Component
 *
 * Reusable empty state with icon, title, message, and optional action button.
 * Used in Marketplace, Orders, and any list view when no items exist.
 */

import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export default function EmptyState({
    icon: Icon = PackageOpen,
    title = "Nothing found",
    message = "Try adjusting your search or filters.",
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
            {/* Icon container with gradient background */}
            <div className="relative mb-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10">
                    <Icon className="h-12 w-12 text-primary/50" />
                </div>
                {/* Subtle glow */}
                <div
                    className="absolute inset-0 rounded-3xl opacity-40 blur-xl"
                    style={{
                        background:
                            "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                    }}
                />
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-1.5">
                {title}
            </h3>
            <p className="text-sm text-foreground-muted max-w-sm mx-auto leading-relaxed">
                {message}
            </p>

            {actionLabel && onAction && (
                <div className="mt-5">
                    <Button variant="outline" onClick={onAction}>
                        {actionLabel}
                    </Button>
                </div>
            )}
        </div>
    );
}
