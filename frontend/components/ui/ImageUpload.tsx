"use client";

/**
 * SMobile — ImageUpload Component
 *
 * Single-image uploader with drag & drop, preview, and backend upload.
 */

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Plus, Loader2, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
}

export default function ImageUpload({
    value,
    onChange,
    disabled = false,
    label,
    className,
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(
        async (file: File) => {
            setError(null);
            setIsUploading(true);

            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await api.post("/media/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                // Build full URL pointing to the backend server
                const backendBase =
                    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
                const fullUrl = `${backendBase}${res.data.url}`;
                onChange(fullUrl);
            } catch (err: any) {
                const msg =
                    err.response?.data?.detail || "Upload failed. Please try again.";
                setError(msg);
            } finally {
                setIsUploading(false);
            }
        },
        [onChange]
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        // Reset so the same file can be re-selected
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled || isUploading) return;
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) uploadFile(file);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                    "cursor-pointer aspect-[4/3]",
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-primary/5",
                    disabled && "opacity-50 cursor-not-allowed",
                    value && "border-solid border-border"
                )}
            >
                {/* Preview */}
                {value && !isUploading && (
                    <>
                        <Image
                            src={value}
                            alt="Uploaded image"
                            fill
                            className="object-cover"
                            sizes="300px"
                        />
                        {/* Remove button */}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-md hover:bg-danger/80 transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </>
                )}

                {/* Upload placeholder */}
                {!value && !isUploading && (
                    <div className="flex flex-col items-center gap-2 text-foreground-muted">
                        {isDragging ? (
                            <ImageIcon className="h-8 w-8 text-primary" />
                        ) : (
                            <Plus className="h-8 w-8" />
                        )}
                        <span className="text-xs text-center px-2">
                            {isDragging ? "Drop to upload" : "Click or drag image"}
                        </span>
                    </div>
                )}

                {/* Loading spinner */}
                {isUploading && (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs text-foreground-muted">Uploading…</span>
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={disabled || isUploading}
                />
            </div>

            {error && (
                <p className="mt-1 text-xs text-danger">{error}</p>
            )}
        </div>
    );
}
