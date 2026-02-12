"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Phone, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

// ── Zod Schema ──────────────────────────────
const loginSchema = z.object({
    phone: z
        .string()
        .min(10, "Phone number must be at least 10 digits")
        .regex(/^\+?\d{10,15}$/, "Enter a valid phone number"),
    password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// ── Page Component ──────────────────────────
export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((s) => s.login);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setApiError(null);
        setIsLoading(true);

        try {
            // OAuth2 password flow expects form-encoded data
            const formData = new URLSearchParams();
            formData.append("username", data.phone);
            formData.append("password", data.password);

            const res = await api.post("/auth/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const { access_token } = res.data;

            // Fetch user profile
            const userRes = await api.get("/users/me", {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            login(userRes.data, access_token);
            toast.success("Welcome back!", { description: "You've been signed in successfully." });
            router.push("/");
        } catch (err: any) {
            if (err.response?.status === 401) {
                setApiError("Invalid phone number or password.");
                toast.error("Login failed", { description: "Invalid phone number or password." });
            } else {
                setApiError("Something went wrong. Please try again.");
                toast.error("Login failed", { description: "Something went wrong. Please try again." });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
            <Card>
                {/* ── Header ───────────────────────── */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Smartphone className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
                    <p className="mt-1 text-sm text-foreground-secondary">
                        Sign in to your SMobile account
                    </p>
                </div>

                {/* ── Error Alert ──────────────────── */}
                {apiError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                    >
                        {apiError}
                    </motion.div>
                )}

                {/* ── Form ─────────────────────────── */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                        label="Phone Number"
                        placeholder="+923001234567"
                        icon={<Phone className="h-4 w-4" />}
                        error={errors.phone?.message}
                        {...register("phone")}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        icon={<Lock className="h-4 w-4" />}
                        error={errors.password?.message}
                        {...register("password")}
                    />

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full"
                        size="lg"
                    >
                        Sign In
                    </Button>
                </form>

                {/* ── Footer ───────────────────────── */}
                <p className="mt-6 text-center text-sm text-foreground-secondary">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/register"
                        className="font-semibold text-primary hover:text-primary-light transition-colors"
                    >
                        Create one
                    </Link>
                </p>
            </Card>
        </motion.div>
    );
}
