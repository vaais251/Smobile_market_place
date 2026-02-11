/**
 * SMobile — Shared TypeScript types
 *
 * Mirrors the backend Pydantic schemas so the frontend
 * has type-safe API interactions.
 */

// ── Auth ────────────────────────────────────
export type UserRole = "ADMIN" | "SELLER" | "BUYER";

export interface User {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
    role: UserRole;
}

export interface UserDetail extends User {
    seller_profile?: SellerProfile | null;
}

export interface SellerProfile {
    id: number;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    is_shop: boolean;
    shop_name?: string | null;
}

export interface Token {
    access_token: string;
    token_type: string;
}

// ── Listings ────────────────────────────────
export type PhoneType = "NEW" | "OLD";

export interface OldPhoneDetails {
    id: number;
    battery_health: number;
    battery_mah: number;
    pta_approved: boolean;
    accessories?: string | null;
    condition_rating: number;
    defect_details?: string | null;
}

export interface NewPhoneDetails {
    id: number;
    processor: string;
    battery_mah: number;
    specs_image_url?: string | null;
}

export interface PhoneListing {
    id: number;
    seller_id: number;
    type: PhoneType;
    brand: string;
    model: string;
    price: number;
    ram: string;
    storage: string;
    main_image_url: string;
    additional_images?: string[] | null;
    location_lat: number;
    location_long: number;
    is_active: boolean;
    created_at?: string;
    old_phone_details?: OldPhoneDetails | null;
    new_phone_details?: NewPhoneDetails | null;
    /** Calculated field — only present when user_lat/user_long provided */
    distance_km?: number | null;
}

export interface PaginatedListings {
    items: PhoneListing[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

// ── Filters ─────────────────────────────────
export interface ListingFilters {
    search?: string;
    brand?: string;
    type?: PhoneType;
    min_price?: number;
    max_price?: number;
    ram?: string;
    storage?: string;
    city?: string;
    user_lat?: number;
    user_long?: number;
    page?: number;
    per_page?: number;
}

// ── Orders ──────────────────────────────────
export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface Order {
    id: number;
    buyer_id: number;
    listing_id: number;
    seller_id: number;
    status: OrderStatus;
    created_at: string;
}
