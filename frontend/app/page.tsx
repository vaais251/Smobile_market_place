"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Loader2,
  SlidersHorizontal,
  X,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Button from "@/components/ui/Button";
import ListingCard from "@/components/listings/ListingCard";
import ListingSkeleton from "@/components/ui/ListingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useListings } from "@/hooks/useListings";
import { cn } from "@/lib/utils";
import type { ListingFilters, PhoneType } from "@/types";

// ── Filter options ──────────────────────────
const RAM_OPTIONS = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"];
const STORAGE_OPTIONS = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];

export default function MarketplacePage() {
  // ── State ──────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ListingFilters>({ page: 1, per_page: 20 });
  const [showFilters, setShowFilters] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "active">("idle");

  const { listings, total, pages, page, isLoading, error } = useListings(filters);

  // ── Search handler ─────────────────────────
  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    },
    [searchInput]
  );

  // ── Location handler ───────────────────────
  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters((prev) => ({
          ...prev,
          user_lat: pos.coords.latitude,
          user_long: pos.coords.longitude,
          page: 1,
        }));
        setGeoStatus("active");
      },
      () => setGeoStatus("idle"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearLocation = () => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next.user_lat;
      delete next.user_long;
      next.page = 1;
      return next;
    });
    setGeoStatus("idle");
  };

  // ── Filter updaters ────────────────────────
  const updateFilter = (key: keyof ListingFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ page: 1, per_page: 20 });
    setGeoStatus("idle");
  };

  const activeFilterCount = [
    filters.brand,
    filters.type,
    filters.min_price,
    filters.max_price,
    filters.ram,
    filters.storage,
    filters.city,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════
          HERO SECTION
         ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 pt-12 pb-8 sm:pt-20 sm:pb-14">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-[300px] w-[300px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
        />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-[250px] w-[250px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              Find Your Perfect{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Phone
              </span>
            </h1>
            <p className="mt-3 text-foreground-secondary text-base sm:text-lg max-w-xl mx-auto">
              Browse thousands of new & used phones from trusted sellers near you.
            </p>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-2xl items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search brand or model..."
                className={cn(
                  "w-full rounded-xl border border-border bg-background-card/80 backdrop-blur-sm",
                  "pl-12 pr-4 py-3.5 text-sm text-foreground",
                  "placeholder:text-foreground-muted",
                  "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary",
                  "transition-all duration-200"
                )}
              />
            </div>
            <Button type="submit" size="lg" className="shrink-0">
              Search
            </Button>
          </form>

          {/* Action row */}
          <div className="mx-auto mt-4 flex max-w-2xl items-center justify-between">
            {/* Location button */}
            <button
              type="button"
              onClick={geoStatus === "active" ? clearLocation : handleUseLocation}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                geoStatus === "active"
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "text-foreground-secondary hover:text-primary hover:bg-primary/5"
              )}
            >
              {geoStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {geoStatus === "idle" && "Use My Location"}
              {geoStatus === "loading" && "Detecting..."}
              {geoStatus === "active" && (
                <>
                  Nearby Mode
                  <X className="h-3 w-3 ml-1" />
                </>
              )}
            </button>

            {/* Filters toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                showFilters || activeFilterCount > 0
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-foreground-secondary hover:text-primary hover:bg-primary/5"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FILTER PANEL (collapsible)
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-border bg-background-secondary/50 backdrop-blur-sm"
          >
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Condition
                  </label>
                  <select
                    value={filters.type || ""}
                    onChange={(e) => updateFilter("type", e.target.value as PhoneType || undefined)}
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">All</option>
                    <option value="NEW">New</option>
                    <option value="OLD">Used</option>
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Min Price
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.min_price ?? ""}
                    onChange={(e) =>
                      updateFilter("min_price", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Max Price
                  </label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={filters.max_price ?? ""}
                    onChange={(e) =>
                      updateFilter("max_price", e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>

                {/* RAM */}
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    RAM
                  </label>
                  <select
                    value={filters.ram || ""}
                    onChange={(e) => updateFilter("ram", e.target.value || undefined)}
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">Any</option>
                    {RAM_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Storage */}
                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                    Storage
                  </label>
                  <select
                    value={filters.storage || ""}
                    onChange={(e) => updateFilter("storage", e.target.value || undefined)}
                    className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  >
                    <option value="">Any</option>
                    {STORAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear button */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-danger hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          RESULTS SECTION
         ═══════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {/* Result count */}
        {!isLoading && !error && (
          <p className="mb-6 text-sm text-foreground-secondary">
            {total === 0
              ? "No listings found"
              : `Showing ${listings.length} of ${total} listing${total === 1 ? "" : "s"}`}
            {geoStatus === "active" && " · sorted by distance"}
          </p>
        )}

        {/* Loading skeleton grid */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="rounded-2xl border border-danger/30 bg-danger/10 px-6 py-4 text-sm text-danger">
              {error}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && listings.length === 0 && (
          <EmptyState
            title="No phones found"
            message="Try adjusting your search or filters to find what you're looking for."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        )}

        {/* Listings grid */}
        {!isLoading && !error && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <ListingCard listing={listing} />
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: page - 1 }))}
                  className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium text-foreground-secondary border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <span className="text-sm text-foreground-secondary px-3">
                  Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                  <span className="font-semibold text-foreground">{pages}</span>
                </span>

                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: page + 1 }))}
                  className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium text-foreground-secondary border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
