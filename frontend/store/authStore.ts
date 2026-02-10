/**
 * SMobile — Auth Store (Zustand)
 *
 * Manages authentication state globally:
 *  - user, token, isAuthenticated
 *  - login(), logout(), hydrate() actions
 *
 * Persists to localStorage so sessions survive page refreshes.
 */

import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;

    /** Save user + token to state & localStorage */
    login: (user: User, token: string) => void;

    /** Clear all auth state & localStorage */
    logout: () => void;

    /**
     * Restore session from localStorage on app mount.
     * Call this once inside a useEffect in the root layout.
     */
    hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    login: (user, token) => {
        localStorage.setItem("smobile_token", token);
        localStorage.setItem("smobile_user", JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem("smobile_token");
        localStorage.removeItem("smobile_user");
        set({ user: null, token: null, isAuthenticated: false });
    },

    hydrate: () => {
        if (typeof window === "undefined") return;

        const token = localStorage.getItem("smobile_token");
        const userJson = localStorage.getItem("smobile_user");

        if (token && userJson) {
            try {
                const user: User = JSON.parse(userJson);
                set({ user, token, isAuthenticated: true });
            } catch {
                // Corrupted data — wipe it
                localStorage.removeItem("smobile_token");
                localStorage.removeItem("smobile_user");
            }
        }
    },
}));
