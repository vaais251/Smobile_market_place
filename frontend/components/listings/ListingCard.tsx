"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Cpu, HardDrive, BatteryMedium, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhoneListing } from "@/types";

interface ListingCardProps {
    listing: PhoneListing;
}

export default function ListingCard({ listing }: ListingCardProps) {
    const isNew = listing.type === "NEW";

    return (
        <Link href={`/listings/${listing.id}`} className="group block">
            <article
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-border",
                    "bg-background-card transition-all duration-300 ease-out",
                    "hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/10",
                    "hover:border-primary/30"
                )}
            >
                {/* ── Image Section ─────────────────── */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-background-secondary">
                    {listing.main_image_url ? (
                        <Image
                            src={listing.main_image_url}
                            alt={`${listing.brand} ${listing.model}`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-foreground-muted">
                            <Cpu className="h-12 w-12 opacity-30" />
                        </div>
                    )}

                    {/* Condition badge */}
                    <span
                        className={cn(
                            "absolute top-3 left-3 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide shadow-md",
                            isNew
                                ? "bg-success text-white"
                                : "bg-warning text-white"
                        )}
                    >
                        {isNew ? "New" : "Used"}
                    </span>

                    {/* PTA badge for used phones */}
                    {!isNew && listing.old_phone_details && (
                        <span
                            className={cn(
                                "absolute top-3 right-3 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold shadow-md",
                                listing.old_phone_details.pta_approved
                                    ? "bg-success/90 text-white"
                                    : "bg-danger/90 text-white"
                            )}
                        >
                            {listing.old_phone_details.pta_approved ? (
                                <ShieldCheck className="h-3 w-3" />
                            ) : (
                                <ShieldX className="h-3 w-3" />
                            )}
                            PTA
                        </span>
                    )}

                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* ── Content Section ───────────────── */}
                <div className="p-4 space-y-3">
                    {/* Price */}
                    <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-primary">
                            Rs. {listing.price.toLocaleString()}
                        </p>
                    </div>

                    {/* Brand + Model */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground truncate">
                            {listing.brand} {listing.model}
                        </h3>
                    </div>

                    {/* Specs row */}
                    <div className="flex items-center gap-3 text-xs text-foreground-secondary">
                        <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {listing.ram}
                        </span>
                        <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {listing.storage}
                        </span>
                        {!isNew && listing.old_phone_details && (
                            <span className="flex items-center gap-1">
                                <BatteryMedium className="h-3 w-3" />
                                {listing.old_phone_details.battery_health}%
                            </span>
                        )}
                    </div>

                    {/* Distance / Location badge */}
                    {listing.distance_km != null && (
                        <div className="flex items-center gap-1 text-xs text-accent font-medium">
                            <MapPin className="h-3 w-3" />
                            <span>{listing.distance_km} km away</span>
                        </div>
                    )}
                </div>
            </article>
        </Link>
    );
}
