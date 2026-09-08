"use client";

import { motion } from "framer-motion";
import { tierForScore } from "@/lib/types";

/**
 * Live Priority Score meter — animated radial gauge (BUILD.md §1.2 flyout).
 * Colour follows the §1 tier tokens; the arc animates on every data refresh.
 */
export function PriorityGauge({
  score,
  size = 132,
  stroke = 10,
  label = "Priority Score",
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const tier = tierForScore(score);
  const color =
    tier === "EMERGENCY"
      ? "#ff3b30"
      : tier === "HIGH"
        ? "#ffcc00"
        : tier === "MEDIUM"
          ? "#ff9500"
          : "#34c759";

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#21262d"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={score}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-mono text-2xl font-bold text-white"
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-[10px] uppercase tracking-wide text-[#8b949e]">
            / 100
          </span>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-[10px] font-medium uppercase tracking-wide text-[#8b949e]">
          {label} · {tier}
        </span>
      </div>
    </div>
  );
}
