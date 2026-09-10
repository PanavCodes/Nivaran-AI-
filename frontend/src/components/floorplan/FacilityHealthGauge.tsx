"use client";

import React from "react";
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

interface FacilityHealthGaugeProps {
  score: number; // 0 to 100
  openIncidents: number;
  emergencyCount: number;
  floorLabel?: string;
}

/**
 * Facility Health Gauge adapted from Civic-Fix (City Health Score) & Smart Campus Intelligence Hub.
 * Renders an animated circular health gauge with facility rating and risk levels.
 */
export const FacilityHealthGauge: React.FC<FacilityHealthGaugeProps> = ({
  score,
  openIncidents,
  emergencyCount,
  floorLabel = "Campus-Wide",
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let statusText = "Optimal";
  let statusColor = "text-emerald-400";
  let ringColor = "#34C759";
  let StatusIcon = CheckCircle;

  if (clampedScore < 50) {
    statusText = "Critical";
    statusColor = "text-red-400";
    ringColor = "#FF3B30";
    StatusIcon = ShieldAlert;
  } else if (clampedScore < 75) {
    statusText = "Degraded";
    statusColor = "text-amber-400";
    ringColor = "#FFCC00";
    StatusIcon = AlertTriangle;
  } else if (clampedScore < 90) {
    statusText = "Stable";
    statusColor = "text-cyan-400";
    ringColor = "#58A6FF";
    StatusIcon = Activity;
  }

  // SVG Gauge calculations (radius = 38)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#30363d] bg-gradient-to-r from-[#161b22] to-[#0d1117] p-3 shadow-lg">
      {/* Circular SVG Gauge */}
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#21262d"
            strokeWidth="8"
          />
          {/* Active progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-extrabold text-white leading-none">
            {clampedScore}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-[#8b949e]">
            FHI
          </span>
        </div>
      </div>

      {/* Metric details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
          <StatusIcon size={13} className={statusColor} />
          <span>Facility Health · {floorLabel}</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={`text-base font-bold ${statusColor}`}>
            {statusText} Status
          </span>
          <span className="text-[11px] text-[#8b949e]">
            {clampedScore}% nominal
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#c9d1d9]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            {openIncidents} Open {openIncidents === 1 ? "Incident" : "Incidents"}
          </span>
          {emergencyCount > 0 ? (
            <span className="flex items-center gap-1 font-semibold text-red-400 animate-pulse">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {emergencyCount} Urgent Flame
            </span>
          ) : (
            <span className="text-[#8b949e]">Zero Breaches</span>
          )}
        </div>
      </div>
    </div>
  );
};
