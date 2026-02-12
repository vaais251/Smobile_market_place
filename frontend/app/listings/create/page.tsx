"use client";

/**
 * SMobile — Create Listing Page
 *
 * Multi-step form for listing a phone (new or used).
 * Protected: redirects to /login if not authenticated.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
    Smartphone,
    Sparkles,
    Recycle,
    ChevronRight,
    Plus,
    X,
    CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ImageUpload from "@/components/ui/ImageUpload";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Brand list ──────────────────────────────
const BRANDS = [
    "Samsung",
    "Apple",
    "Xiaomi",
    "Oppo",
    "Vivo",
    "Realme",
    "OnePlus",
    "Huawei",
    "Infinix",
    "Tecno",
    "Nokia",
    "Google",
    "Motorola",
    "Sony",
    "Other",
];

const RAM_OPTIONS = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"];
const STORAGE_OPTIONS = [
    "16GB",
    "32GB",
    "64GB",
    "128GB",
    "256GB",
    "512GB",
    "1TB",
];

// ── Zod Schema ──────────────────────────────
const baseSchema = z.object({
    type: z.enum(["NEW", "OLD"]),
    brand: z.string().min(1, "Brand is required"),
    model: z.string().min(1, "Model is required"),
    price: z.coerce.number().positive("Price must be positive"),
    ram: z.string().min(1, "RAM is required"),
    storage: z.string().min(1, "Storage is required"),
    main_image_url: z
        .string()
        .url("Please upload a main image")
        .min(1, "Main image is required"),
});

const oldPhoneSchema = z.object({
    condition_rating: z.coerce
        .number()
        .min(1, "Min 1")
        .max(10, "Max 10"),
    battery_health: z.coerce
        .number()
        .min(0, "Min 0%")
        .max(100, "Max 100%"),
    battery_mah: z.coerce.number().positive("Required"),
    pta_approved: z.boolean(),
    accessories: z.string().optional(),
    defect_details: z.string().optional(),
});

const newPhoneSchema = z.object({
    processor: z.string().min(1, "Processor is required"),
    battery_mah: z.coerce.number().positive("Required"),
    specs_image_url: z.string().optional(),
});

const listingSchema = z.discriminatedUnion("type", [
    baseSchema.extend({
        type: z.literal("OLD"),
        old_phone_details: oldPhoneSchema,
        additional_images: z.array(z.string().url()).optional(),
    }),
    baseSchema.extend({
        type: z.literal("NEW"),
        new_phone_details: newPhoneSchema,
    }),
]);

type ListingForm = z.infer<typeof listingSchema>;

// ── Page Component ──────────────────────────
export default function CreateListingPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    const [phoneType, setPhoneType] = useState<"NEW" | "OLD">("OLD");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<string[]>([]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, router]);

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ListingForm>({
        resolver: zodResolver(listingSchema) as any,
        defaultValues: {
            type: "OLD",
            brand: "",
            model: "",
            price: undefined as any,
            ram: "",
            storage: "",
            main_image_url: "",
            old_phone_details: {
                condition_rating: 7,
                battery_health: 80,
                battery_mah: 4000,
                pta_approved: false,
                accessories: "",
                defect_details: "",
            },
        } as any,
    });

    // Watch type to toggle sections
    const currentType = watch("type");

    // Sync phoneType toggle with form
    const handleTypeChange = (type: "NEW" | "OLD") => {
        setPhoneType(type);
        setValue("type", type);
        // Reset type-specific fields
        if (type === "NEW") {
            setValue("new_phone_details" as any, {
                processor: "",
                battery_mah: 5000,
                specs_image_url: "",
            });
        } else {
            setValue("old_phone_details" as any, {
                condition_rating: 7,
                battery_health: 80,
                battery_mah: 4000,
                pta_approved: false,
                accessories: "",
                defect_details: "",
            });
        }
    };

    // ── Additional images helpers ──────────────
    const handleAddImage = (url: string) => {
        if (url && additionalImages.length < 5) {
            const next = [...additionalImages, url];
            setAdditionalImages(next);
        }
    };

    const handleRemoveAdditionalImage = (index: number) => {
        const next = additionalImages.filter((_, i) => i !== index);
        setAdditionalImages(next);
    };

    // ── Submit ────────────────────────────────
    const onSubmit = async (data: ListingForm) => {
        setApiError(null);
        setIsSubmitting(true);

        try {
            const payload: any = {
                type: data.type,
                brand: data.brand,
                model: data.model,
                price: data.price,
                ram: data.ram,
                storage: data.storage,
                main_image_url: data.main_image_url,
            };

            if (data.type === "OLD") {
                payload.old_phone_details = data.old_phone_details;
                if (additionalImages.length > 0) {
                    payload.additional_images = additionalImages;
                }
            } else {
                payload.new_phone_details = data.new_phone_details;
            }

            const res = await api.post("/listings", payload);
            toast.success("Listing created!", { description: "Your phone is now live on the marketplace." });
            router.push(`/listings/${res.data.id}`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || "Failed to create listing. Please try again.";
            setApiError(msg);
            toast.error("Listing failed", { description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* ── Header ─────────────────────── */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-foreground">
                        Sell Your Phone
                    </h1>
                    <p className="mt-2 text-foreground-secondary">
                        Create a listing and reach buyers near you
                    </p>
                </div>

                <Card className="p-6 sm:p-8">
                    {/* ── Error ─────────────────────── */}
                    {apiError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                        >
                            {apiError}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {/* ═══ TYPE TOGGLE ═══════════════ */}
                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-3">
                                What are you selling?
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(
                                    [
                                        {
                                            value: "OLD" as const,
                                            icon: Recycle,
                                            label: "Used Phone",
                                            desc: "Pre-owned device",
                                        },
                                        {
                                            value: "NEW" as const,
                                            icon: Sparkles,
                                            label: "New Phone",
                                            desc: "Brand new / sealed",
                                        },
                                    ] as const
                                ).map(({ value, icon: Icon, label, desc }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleTypeChange(value)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                                            phoneType === value
                                                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                                                : "border-border hover:border-primary/30 hover:bg-primary/5"
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                "h-6 w-6 transition-colors",
                                                phoneType === value
                                                    ? "text-primary"
                                                    : "text-foreground-muted"
                                            )}
                                        />
                                        <span className="text-sm font-semibold text-foreground">
                                            {label}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            {desc}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ═══ COMMON FIELDS ═════════════ */}
                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-primary" />
                                Phone Details
                            </h3>

                            {/* Brand */}
                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                    Brand
                                </label>
                                <select
                                    {...register("brand")}
                                    className={cn(
                                        "w-full rounded-xl border bg-background-card px-4 py-3 text-sm text-foreground",
                                        "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-all",
                                        errors.brand ? "border-danger" : "border-border"
                                    )}
                                >
                                    <option value="">Select brand</option>
                                    {BRANDS.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>
                                {errors.brand && (
                                    <p className="mt-1 text-xs text-danger">
                                        {errors.brand.message}
                                    </p>
                                )}
                            </div>

                            {/* Model */}
                            <Input
                                label="Model"
                                placeholder="e.g. Galaxy S24 Ultra"
                                error={errors.model?.message}
                                {...register("model")}
                            />

                            {/* Price / RAM / Storage row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input
                                    label="Price (PKR)"
                                    type="number"
                                    placeholder="45000"
                                    error={errors.price?.message}
                                    {...register("price")}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                        RAM
                                    </label>
                                    <select
                                        {...register("ram")}
                                        className={cn(
                                            "w-full rounded-xl border bg-background-card px-4 py-3 text-sm text-foreground",
                                            "focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all",
                                            errors.ram ? "border-danger" : "border-border"
                                        )}
                                    >
                                        <option value="">Select</option>
                                        {RAM_OPTIONS.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.ram && (
                                        <p className="mt-1 text-xs text-danger">
                                            {errors.ram.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                        Storage
                                    </label>
                                    <select
                                        {...register("storage")}
                                        className={cn(
                                            "w-full rounded-xl border bg-background-card px-4 py-3 text-sm text-foreground",
                                            "focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all",
                                            errors.storage ? "border-danger" : "border-border"
                                        )}
                                    >
                                        <option value="">Select</option>
                                        {STORAGE_OPTIONS.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.storage && (
                                        <p className="mt-1 text-xs text-danger">
                                            {errors.storage.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Main Image */}
                            <Controller
                                name="main_image_url"
                                control={control}
                                render={({ field }) => (
                                    <ImageUpload
                                        label="Main Image *"
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={isSubmitting}
                                        className="max-w-xs"
                                    />
                                )}
                            />
                            {errors.main_image_url && (
                                <p className="text-xs text-danger -mt-2">
                                    {errors.main_image_url.message}
                                </p>
                            )}
                        </div>

                        {/* ═══ USED PHONE DETAILS ════════ */}
                        <AnimatePresence mode="wait">
                            {currentType === "OLD" && (
                                <motion.div
                                    key="old-details"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden space-y-5"
                                >
                                    <div className="border-t border-border pt-6">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
                                            <Recycle className="h-4 w-4 text-warning" />
                                            Used Phone Details
                                        </h3>

                                        {/* Condition + Battery Health */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                                    Condition Rating (1-10)
                                                </label>
                                                <Controller
                                                    name="old_phone_details.condition_rating"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="range"
                                                                min="1"
                                                                max="10"
                                                                value={field.value ?? 7}
                                                                onChange={(e) =>
                                                                    field.onChange(Number(e.target.value))
                                                                }
                                                                className="w-full accent-primary"
                                                            />
                                                            <div className="flex justify-between text-xs text-foreground-muted">
                                                                <span>Poor</span>
                                                                <span className="text-sm font-bold text-primary">
                                                                    {field.value ?? 7}/10
                                                                </span>
                                                                <span>Mint</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                                    Battery Health (%)
                                                </label>
                                                <Controller
                                                    name="old_phone_details.battery_health"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={field.value ?? 80}
                                                                onChange={(e) =>
                                                                    field.onChange(Number(e.target.value))
                                                                }
                                                                className="w-full accent-primary"
                                                            />
                                                            <div className="flex justify-center">
                                                                <span
                                                                    className={cn(
                                                                        "text-sm font-bold",
                                                                        (field.value ?? 80) >= 80
                                                                            ? "text-success"
                                                                            : (field.value ?? 80) >= 50
                                                                                ? "text-warning"
                                                                                : "text-danger"
                                                                    )}
                                                                >
                                                                    {field.value ?? 80}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Battery mAh + PTA */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                            <Input
                                                label="Battery (mAh)"
                                                type="number"
                                                placeholder="4000"
                                                error={
                                                    (errors as any).old_phone_details?.battery_mah
                                                        ?.message
                                                }
                                                {...register("old_phone_details.battery_mah" as any)}
                                            />

                                            <div className="flex items-end pb-1">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <Controller
                                                        name="old_phone_details.pta_approved"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <div
                                                                onClick={() => field.onChange(!field.value)}
                                                                className={cn(
                                                                    "relative h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer",
                                                                    field.value
                                                                        ? "bg-success"
                                                                        : "bg-foreground-muted/30"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                                                                        field.value && "translate-x-5"
                                                                    )}
                                                                />
                                                            </div>
                                                        )}
                                                    />
                                                    <span className="text-sm font-medium text-foreground">
                                                        PTA Approved
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Accessories */}
                                        <div className="mb-5">
                                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                                Accessories Included
                                            </label>
                                            <input
                                                placeholder="e.g. Charger, Box, Earphones"
                                                {...register("old_phone_details.accessories" as any)}
                                                className="w-full rounded-xl border border-border bg-background-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                                            />
                                        </div>

                                        {/* Defects */}
                                        <div className="mb-5">
                                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                                Defects / Issues
                                            </label>
                                            <textarea
                                                placeholder="Describe any scratches, dents, or screen issues..."
                                                rows={3}
                                                {...register("old_phone_details.defect_details" as any)}
                                                className="w-full rounded-xl border border-border bg-background-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all resize-none"
                                            />
                                        </div>

                                        {/* Additional Images */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                                                Additional Photos (up to 5)
                                            </label>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                {additionalImages.map((url, i) => (
                                                    <div
                                                        key={i}
                                                        className="relative aspect-square rounded-xl overflow-hidden border border-border"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Photo ${i + 1}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAdditionalImage(i)}
                                                            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white text-xs shadow cursor-pointer"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {additionalImages.length < 5 && (
                                                    <ImageUpload
                                                        value=""
                                                        onChange={handleAddImage}
                                                        disabled={isSubmitting}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ═══ NEW PHONE DETAILS ════════ */}
                            {currentType === "NEW" && (
                                <motion.div
                                    key="new-details"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden space-y-5"
                                >
                                    <div className="border-t border-border pt-6">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
                                            <Sparkles className="h-4 w-4 text-success" />
                                            New Phone Details
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Processor"
                                                placeholder="e.g. Snapdragon 8 Gen 3"
                                                error={
                                                    (errors as any).new_phone_details?.processor?.message
                                                }
                                                {...register("new_phone_details.processor" as any)}
                                            />

                                            <Input
                                                label="Battery (mAh)"
                                                type="number"
                                                placeholder="5000"
                                                error={
                                                    (errors as any).new_phone_details?.battery_mah
                                                        ?.message
                                                }
                                                {...register("new_phone_details.battery_mah" as any)}
                                            />
                                        </div>

                                        {/* Specs image */}
                                        <div className="mt-5">
                                            <Controller
                                                name="new_phone_details.specs_image_url"
                                                control={control}
                                                render={({ field }) => (
                                                    <ImageUpload
                                                        label="Specs Sheet Image (optional)"
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        disabled={isSubmitting}
                                                        className="max-w-xs"
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ═══ SUBMIT ════════════════════ */}
                        <div className="border-t border-border pt-6">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                size="lg"
                                className="w-full gap-2"
                            >
                                <CheckCircle className="h-5 w-5" />
                                Publish Listing
                            </Button>
                        </div>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
