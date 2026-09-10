"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const variants: Record<Variant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs active:bg-indigo-800 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500/30",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs active:bg-red-800 font-semibold focus-visible:ring-2 focus-visible:ring-red-500/30",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:bg-emerald-800 font-semibold focus-visible:ring-2 focus-visible:ring-emerald-500/30",
    outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs font-semibold focus-visible:ring-2 focus-visible:ring-slate-300",
  };
  const sizes: Record<Size, string> = {
    sm: "px-2.5 py-1 text-xs rounded-md",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-5 py-2.5 text-base rounded-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none outline-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
