/**
 * Auth group layout — centered, gradient background
 */

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden">
            {/* ── Gradient orbs ─────────────────────── */}
            <div
                className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20"
                style={{
                    background:
                        "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                }}
            />
            <div
                className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-15"
                style={{
                    background:
                        "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
                }}
            />

            {/* Page content */}
            <div className="relative z-10 w-full max-w-md">{children}</div>
        </div>
    );
}
