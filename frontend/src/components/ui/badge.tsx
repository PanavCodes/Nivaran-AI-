import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "emergency" | "high" | "medium" | "resolved" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-[#21262d] text-[#8b949e] border-[#30363d]",
    accent: "bg-accent/10 text-accent border-accent/40",
    emergency: "bg-emergency/15 text-emergency border-emergency/40",
    high: "bg-high/15 text-high border-high/40",
    medium: "bg-medium/15 text-medium border-medium/40",
    resolved: "bg-resolved/15 text-resolved border-resolved/40",
    outline: "bg-transparent text-[#c9d1d9] border-[#30363d]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
