"use client";

/**
 * SMobile — Providers
 *
 * Wraps the app with client-side providers:
 *  - Auth hydration (restore session from localStorage)
 *  - Theme provider (will be extended later for dark mode toggle)
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const hydrate = useAuthStore((state) => state.hydrate);

    // Restore auth session on first mount
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return <>{children}</>;
}
