"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Phone,
    Lock,
    MapPin,
    Building2,
    Store,
    CheckCircle2,
    Loader2,
    Smartphone,
} from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

// ═══════════════════════════════════════════════
//  ZOD SCHEMA (adapts to role)
// ═══════════════════════════════════════════════
const baseSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        phone: z
            .string()
            .min(10, "Phone must be at least 10 digits")
            .regex(/^\+?\d{10,15}$/, "Enter a valid phone number"),
        email: z.string().email("Enter a valid email").optional().or(z.literal("")),
        password: z
            .string()
            .min(8, "At least 8 characters")
            .regex(/[A-Z]/, "Must contain an uppercase letter")
            .regex(/[a-z]/, "Must contain a lowercase letter")
            .regex(/\d/, "Must contain a digit"),
        confirmPassword: z.string(),
        role: z.enum(["BUYER", "SELLER"] as const),

        // Seller-only fields (optional at schema level, validated below)
        address: z.string().optional(),
        city: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        is_shop: z.boolean().optional(),
        shop_name: z.string().optional(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })
    .refine(
        (d) => {
            if (d.role === "SELLER") {
                return !!d.address && d.address.length >= 3;
            }
            return true;
        },
        { message: "Address is required for sellers", path: ["address"] }
    )
    .refine(
        (d) => {
            if (d.role === "SELLER") {
                return !!d.city && d.city.length >= 2;
            }
            return true;
        },
        { message: "City is required for sellers", path: ["city"] }
    )
    .refine(
        (d) => {
            if (d.role === "SELLER") {
                return d.latitude != null && d.longitude != null;
            }
            return true;
        },
        { message: "Location is required — use the detect button", path: ["latitude"] }
    );

type RegisterForm = z.infer<typeof baseSchema>;

// ═══════════════════════════════════════════════
//  PAGE COMPONENT
// ═══════════════════════════════════════════════
export default function RegisterPage() {
    const router = useRouter();
    const login = useAuthStore((s) => s.login);

    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(baseSchema),
        defaultValues: {
            role: "BUYER",
            is_shop: false,
        },
    });

    const selectedRole = watch("role");
    const isShop = watch("is_shop");

    // ── Geolocation ───────────────────────────
    const detectLocation = () => {
        if (!navigator.geolocation) {
            setGeoStatus("error");
            return;
        }
        setGeoStatus("loading");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setValue("latitude", pos.coords.latitude, { shouldValidate: true });
                setValue("longitude", pos.coords.longitude, { shouldValidate: true });
                setGeoStatus("success");
            },
            () => setGeoStatus("error"),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ── Submit ────────────────────────────────
    const onSubmit = async (data: RegisterForm) => {
        setApiError(null);
        setIsLoading(true);

        try {
            const payload: Record<string, any> = {
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                password: data.password,
                role: data.role,
            };

            if (data.role === "SELLER") {
                payload.seller_profile = {
                    address: data.address,
                    city: data.city,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    is_shop: data.is_shop ?? false,
                    shop_name: data.is_shop ? data.shop_name : undefined,
                };
            }

            await api.post("/auth/register", payload);

            // Auto-login after successful registration
            const formData = new URLSearchParams();
            formData.append("username", data.phone);
            formData.append("password", data.password);

            const loginRes = await api.post("/auth/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const { access_token } = loginRes.data;
            const userRes = await api.get("/users/me", {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            login(userRes.data, access_token);
            router.push("/");
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            if (typeof detail === "string") {
                setApiError(detail);
            } else {
                setApiError("Registration failed. Please check your inputs.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Slide animation is applied inline on motion.div elements

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
            <Card className="max-w-lg mx-auto">
                {/* ── Header ───────────────────────── */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Smartphone className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                    <p className="mt-1 text-sm text-foreground-secondary">
                        Join SMobile marketplace
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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* ── Role Toggle ────────────────── */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary mb-2">
                            I am a
                        </label>
                        <Controller
                            control={control}
                            name="role"
                            render={({ field }) => (
                                <div className="grid grid-cols-2 gap-3">
                                    {(["BUYER", "SELLER"] as const).map((role) => {
                                        const isActive = field.value === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => field.onChange(role)}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer",
                                                    isActive
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                        : "border-border text-foreground-secondary hover:border-foreground-muted"
                                                )}
                                            >
                                                {role === "BUYER" ? (
                                                    <User className="h-4 w-4" />
                                                ) : (
                                                    <Store className="h-4 w-4" />
                                                )}
                                                {role === "BUYER" ? "Buyer" : "Seller"}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                    </div>

                    {/* ── Common Fields ──────────────── */}
                    <Input
                        label="Full Name"
                        placeholder="Ahmad Khan"
                        icon={<User className="h-4 w-4" />}
                        error={errors.name?.message}
                        {...register("name")}
                    />

                    <Input
                        label="Phone Number"
                        placeholder="+923001234567"
                        icon={<Phone className="h-4 w-4" />}
                        error={errors.phone?.message}
                        {...register("phone")}
                    />

                    <Input
                        label="Email (Optional)"
                        type="email"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                        {...register("email")}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        icon={<Lock className="h-4 w-4" />}
                        error={errors.password?.message}
                        {...register("password")}
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        icon={<Lock className="h-4 w-4" />}
                        error={errors.confirmPassword?.message}
                        {...register("confirmPassword")}
                    />

                    {/* ── Seller-Only Section ────────── */}
                    <AnimatePresence>
                        {selectedRole === "SELLER" && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="space-y-5 overflow-hidden">
                                <div className="border-t border-border pt-5">
                                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        Seller Details
                                    </h3>

                                    <div className="space-y-4">
                                        <Input
                                            label="Address"
                                            placeholder="Shop #12, Mobile Market, Hall Road"
                                            icon={<MapPin className="h-4 w-4" />}
                                            error={errors.address?.message}
                                            {...register("address")}
                                        />

                                        <Input
                                            label="City"
                                            placeholder="Lahore"
                                            icon={<Building2 className="h-4 w-4" />}
                                            error={errors.city?.message}
                                            {...register("city")}
                                        />

                                        {/* Location Detection */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground-secondary mb-2">
                                                Location
                                            </label>
                                            <button
                                                type="button"
                                                onClick={detectLocation}
                                                disabled={geoStatus === "loading"}
                                                className={cn(
                                                    "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-all duration-200 cursor-pointer",
                                                    geoStatus === "success"
                                                        ? "border-success/50 bg-success/10 text-success"
                                                        : geoStatus === "error"
                                                            ? "border-danger/50 bg-danger/10 text-danger"
                                                            : "border-border text-foreground-secondary hover:border-primary hover:text-primary"
                                                )}
                                            >
                                                {geoStatus === "loading" && (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                )}
                                                {geoStatus === "success" && (
                                                    <CheckCircle2 className="h-4 w-4" />
                                                )}
                                                {geoStatus === "idle" && <MapPin className="h-4 w-4" />}
                                                {geoStatus === "error" && <MapPin className="h-4 w-4" />}

                                                {geoStatus === "idle" && "Auto-Detect My Location"}
                                                {geoStatus === "loading" && "Detecting..."}
                                                {geoStatus === "success" && "Location Captured ✓"}
                                                {geoStatus === "error" && "Failed — Try Again"}
                                            </button>
                                            {errors.latitude?.message && (
                                                <p className="text-xs text-danger mt-1">
                                                    {errors.latitude.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Is Shop Toggle */}
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    {...register("is_shop")}
                                                />
                                                <div className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary" />
                                                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                            </div>
                                            <span className="text-sm text-foreground-secondary group-hover:text-foreground transition-colors">
                                                I have a physical shop
                                            </span>
                                        </label>

                                        {/* Shop Name (conditional) */}
                                        <AnimatePresence>
                                            {isShop && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                                    <Input
                                                        label="Shop Name"
                                                        placeholder="Khan Mobile Zone"
                                                        icon={<Store className="h-4 w-4" />}
                                                        error={errors.shop_name?.message}
                                                        {...register("shop_name")}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Submit ─────────────────────── */}
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full"
                        size="lg"
                    >
                        Create Account
                    </Button>
                </form>

                {/* ── Footer ───────────────────────── */}
                <p className="mt-6 text-center text-sm text-foreground-secondary">
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-primary hover:text-primary-light transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </Card>
        </motion.div>
    );
}
