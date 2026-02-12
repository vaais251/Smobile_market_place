"use client";

/**
 * SMobile — Skeleton Component
 *
 * Generic pulsing placeholder shape for loading states.
 * Accepts className for custom sizing and shapes.
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-xl bg-foreground-muted/15",
                className
            )}
        />
    );
}
