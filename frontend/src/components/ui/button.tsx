"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger" | "success" | "outline";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary: "bg-accent text-[#0d1117] hover:bg-accent/85 font-semibold",
    ghost: "bg-transparent text-[#c9d1d9] hover:bg-white/5",
    danger: "bg-emergency/90 text-white hover:bg-emergency font-semibold",
    success: "bg-resolved/90 text-[#0d1117] hover:bg-resolved font-semibold",
    outline: "border border-[#30363d] text-[#c9d1d9] hover:border-accent/60 hover:text-accent",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
