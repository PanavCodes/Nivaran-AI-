"use client";

import React from "react";
import { motion } from "framer-motion";
import { ORDERED_FLOOR_IDS, getFloorMeta } from "@/lib/campus_floors";
import { FloorSummaryItem } from "@/lib/types";
import { Building2, ChevronRight, AlertCircle } from "lucide-react";

interface ElevatorFloorNavigatorProps {
  selectedFloor: string;
  onSelectFloor: (floor: string) => void;
  floorSummaries?: FloorSummaryItem[];
  className?: string;
}

export const ElevatorFloorNavigator: React.FC<ElevatorFloorNavigatorProps> = ({
  selectedFloor,
  onSelectFloor,
  floorSummaries = [],
  className = "",
}) => {
  const summaryMap = React.useMemo(() => {
    const map = new Map<string, FloorSummaryItem>();
    floorSummaries.forEach((s) => map.set(s.floor.toUpperCase(), s));
    return map;
  }, [floorSummaries]);

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 px-2 pb-3 border-b border-slate-100">
        <Building2 className="h-4 w-4 text-indigo-600" />
        <div>
          <h3 className="text-xs font-bold tracking-wide uppercase text-slate-900">
            Floor Levels
          </h3>
          <p className="text-[10px] text-slate-500">10-Floor Complex</p>
        </div>
      </div>

      {/* Vertical Elevator Control Column */}
      <div className="mt-2.5 flex flex-col gap-1.5 overflow-y-auto max-h-[520px] pr-1">
        {ORDERED_FLOOR_IDS.map((floorId) => {
          const meta = getFloorMeta(floorId);
          const isSelected = selectedFloor.toUpperCase() === floorId.toUpperCase();
          const summary = summaryMap.get(floorId.toUpperCase());
          const openCount = summary?.open_count ?? 0;
          const emergencyCount = summary?.emergency_count ?? 0;

          return (
            <motion.button
              key={floorId}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectFloor(floorId)}
              className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all duration-150 border cursor-pointer ${
                isSelected
                  ? "border-indigo-200 bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs"
                  : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Floor Badge Indicator */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}
                >
                  {meta.shortLabel}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-none">{meta.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {meta.rooms.length} zones
                  </span>
                </div>
              </div>

              {/* Status and Active Incident Pill */}
              <div className="flex items-center gap-1.5">
                {emergencyCount > 0 && (
                  <span
                    title={`${emergencyCount} Immediate Priority SLA`}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 border border-red-200"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </span>
                )}

                {openCount > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      emergencyCount > 0
                        ? "bg-red-600 text-white"
                        : isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {openCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">0</span>
                )}

                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-400 opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
