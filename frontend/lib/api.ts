/**
 * SMobile — Axios API Client
 *
 * Pre-configured Axios instance with:
 *  - Request interceptor: auto-injects JWT from localStorage
 *  - Response interceptor: redirects to /login on 401
 */

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
});

// ── Request Interceptor ─────────────────────
// Automatically attach Bearer token to every outgoing request
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("smobile_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ────────────────────
// Handle expired / invalid sessions globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            const pathname = window.location.pathname;
            const requestUrl = error.config?.url || "";

            // Don't intercept 401s on auth pages or for auth-related API calls.
            // This lets the register/login pages handle their own errors.
            const isOnAuthPage =
                pathname.startsWith("/login") ||
                pathname.startsWith("/register");
            const isAuthRequest =
                requestUrl.includes("/auth/login") ||
                requestUrl.includes("/auth/register");

            if (!isOnAuthPage && !isAuthRequest) {
                // Clear stale auth data
                localStorage.removeItem("smobile_token");
                localStorage.removeItem("smobile_user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
