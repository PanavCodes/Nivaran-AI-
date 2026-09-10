import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "emergency" | "high" | "medium" | "resolved" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200/90",
    emergency: "bg-red-50 text-red-700 border-red-200/90",
    high: "bg-amber-50 text-amber-800 border-amber-200/90",
    medium: "bg-orange-50 text-orange-800 border-orange-200/90",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
    outline: "bg-white text-slate-700 border-slate-200 shadow-xs",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-normal transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
