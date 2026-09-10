"use client";

import React from "react";
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

interface FacilityHealthGaugeProps {
  score: number; // 0 to 100
  openIncidents: number;
  emergencyCount: number;
  floorLabel?: string;
}

export const FacilityHealthGauge: React.FC<FacilityHealthGaugeProps> = ({
  score,
  openIncidents,
  emergencyCount,
  floorLabel = "Campus-Wide",
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let statusText = "Optimal";
  let statusColor = "text-emerald-700";
  let ringColor = "#16a34a";
  let StatusIcon = CheckCircle;

  if (clampedScore < 50) {
    statusText = "Critical";
    statusColor = "text-red-700";
    ringColor = "#dc2626";
    StatusIcon = ShieldAlert;
  } else if (clampedScore < 75) {
    statusText = "Degraded";
    statusColor = "text-amber-800";
    ringColor = "#d97706";
    StatusIcon = AlertTriangle;
  } else if (clampedScore < 90) {
    statusText = "Stable";
    statusColor = "text-indigo-700";
    ringColor = "#4f46e5";
    StatusIcon = Activity;
  }

  // SVG Gauge calculations (radius = 38)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
      {/* Circular SVG Gauge */}
      <div className="relative flex h-18 w-18 shrink-0 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="7"
          />
          {/* Active progress ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-800 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-slate-900 leading-none">
            {clampedScore}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-400">
            FHI
          </span>
        </div>
      </div>

      {/* Metric details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <StatusIcon size={13} className={statusColor} />
          <span>Facility Health · {floorLabel}</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={`text-base font-bold ${statusColor}`}>
            {statusText}
          </span>
          <span className="text-xs text-slate-400">
            {clampedScore}% operational nominal
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            {openIncidents} Open {openIncidents === 1 ? "Incident" : "Incidents"}
          </span>
          {emergencyCount > 0 ? (
            <span className="flex items-center gap-1 font-bold text-red-700">
              <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
              {emergencyCount} Urgent Priority
            </span>
          ) : (
            <span className="text-emerald-700">Zero Critical Incidents</span>
          )}
        </div>
      </div>
    </div>
  );
};
