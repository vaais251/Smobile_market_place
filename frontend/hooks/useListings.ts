"use client";

/**
 * SMobile — useListings hook
 *
 * Fetches paginated listings from the API with filters.
 * Automatically refetches when filters change.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import type { PhoneListing, ListingFilters, PaginatedListings } from "@/types";

interface UseListingsReturn {
    listings: PhoneListing[];
    total: number;
    pages: number;
    page: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useListings(filters: ListingFilters = {}): UseListingsReturn {
    const [listings, setListings] = useState<PhoneListing[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use a ref to track the latest request and prevent race conditions
    const abortRef = useRef<AbortController | null>(null);

    const fetchListings = useCallback(async () => {
        // Cancel any in-flight request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            // Build query params, only including non-empty values
            const params: Record<string, string | number> = {};

            if (filters.search) params.search = filters.search;
            if (filters.brand) params.brand = filters.brand;
            if (filters.type) params.type = filters.type;
            if (filters.min_price != null) params.min_price = filters.min_price;
            if (filters.max_price != null) params.max_price = filters.max_price;
            if (filters.ram) params.ram = filters.ram;
            if (filters.storage) params.storage = filters.storage;
            if (filters.city) params.city = filters.city;
            if (filters.user_lat != null) params.user_lat = filters.user_lat;
            if (filters.user_long != null) params.user_long = filters.user_long;
            params.page = filters.page ?? 1;
            params.per_page = filters.per_page ?? 20;

            const res = await api.get<PaginatedListings>("/listings", {
                params,
                signal: controller.signal,
            });

            setListings(res.data.items);
            setTotal(res.data.total);
            setPages(res.data.pages);
            setPage(res.data.page);
        } catch (err: any) {
            if (err.name === "CanceledError" || err.name === "AbortError") return;
            setError(err.response?.data?.detail || "Failed to fetch listings.");
        } finally {
            setIsLoading(false);
        }
    }, [
        filters.search,
        filters.brand,
        filters.type,
        filters.min_price,
        filters.max_price,
        filters.ram,
        filters.storage,
        filters.city,
        filters.user_lat,
        filters.user_long,
        filters.page,
        filters.per_page,
    ]);

    useEffect(() => {
        fetchListings();
        // Cleanup: abort on unmount
        return () => abortRef.current?.abort();
    }, [fetchListings]);

    return { listings, total, pages, page, isLoading, error, refetch: fetchListings };
}
