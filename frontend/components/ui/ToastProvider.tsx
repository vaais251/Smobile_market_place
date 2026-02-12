"use client";

/**
 * SMobile — ToastProvider
 *
 * Wraps sonner's Toaster with theme-aware styling.
 * Positioned bottom-right with rich colors matching our design system.
 */

import { Toaster } from "sonner";

export default function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
                style: {
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    borderRadius: "1rem",
                    fontSize: "0.875rem",
                },
                classNames: {
                    toast: "shadow-xl border-border",
                    title: "font-semibold",
                    description: "text-foreground-secondary",
                    closeButton: "bg-background hover:bg-background-secondary",
                },
            }}
        />
    );
}
