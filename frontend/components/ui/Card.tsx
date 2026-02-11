"use client";

import { cn } from "@/lib/utils";

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export default function Card({ children, className }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-border",
                "bg-background-card/70 backdrop-blur-xl",
                "shadow-xl shadow-black/5 dark:shadow-black/30",
                "p-6 sm:p-8",
                className
            )}
        >
            {children}
        </div>
    );
}
