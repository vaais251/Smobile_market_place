"use client";

/**
 * SMobile — ListingSkeleton Component
 *
 * Mimics the layout of ListingCard during loading.
 * Shows pulsing placeholders for image, title, price, and specs.
 */

import Skeleton from "@/components/ui/Skeleton";

export default function ListingSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-background-card">
            {/* Image placeholder */}
            <Skeleton className="aspect-[4/3] w-full rounded-none" />

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Price */}
                <Skeleton className="h-6 w-28" />

                {/* Brand + Model */}
                <Skeleton className="h-4 w-40" />

                {/* Specs row */}
                <div className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-14" />
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3.5 w-12" />
                </div>
            </div>
        </div>
    );
}
