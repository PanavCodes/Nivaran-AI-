"use client";

import React from "react";
import { motion } from "framer-motion";
import { ORDERED_FLOOR_IDS, getFloorMeta } from "@/lib/campus_floors";
import { FloorSummaryItem } from "@/lib/types";
import { Building2, ChevronRight, Flame } from "lucide-react";

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
      className={`flex flex-col rounded-xl border border-[#30363d] bg-[#161b22] p-3 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex items-center gap-2 px-2 pb-3 border-b border-[#30363d]">
        <Building2 className="h-4 w-4 text-[#58a6ff]" />
        <div>
          <h3 className="text-xs font-bold tracking-wide uppercase text-white">
            Building Floors
          </h3>
          <p className="text-[10px] text-gray-400">10 Multi-Level Campus</p>
        </div>
      </div>

      {/* Vertical Elevator Control Column */}
      <div className="mt-2.5 flex flex-col gap-1.5 overflow-y-auto max-h-[520px] pr-1 custom-scrollbar">
        {ORDERED_FLOOR_IDS.map((floorId) => {
          const meta = getFloorMeta(floorId);
          const isSelected = selectedFloor.toUpperCase() === floorId.toUpperCase();
          const summary = summaryMap.get(floorId.toUpperCase());
          const openCount = summary?.open_count ?? 0;
          const emergencyCount = summary?.emergency_count ?? 0;

          return (
            <motion.button
              key={floorId}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectFloor(floorId)}
              className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all duration-200 border ${
                isSelected
                  ? "border-[#58a6ff] bg-[#58a6ff]/15 text-white shadow-md shadow-[#58a6ff]/20 font-semibold"
                  : "border-transparent bg-[#0d1117]/60 text-gray-300 hover:border-[#30363d] hover:bg-[#21262d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Floor Badge Indicator */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold transition-colors ${
                    isSelected
                      ? "bg-[#58a6ff] text-black"
                      : "bg-[#21262d] text-gray-300 group-hover:text-white"
                  }`}
                >
                  {meta.shortLabel}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs font-medium leading-none">{meta.label}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    {meta.rooms.length} rooms / zones
                  </span>
                </div>
              </div>

              {/* Status and Active Incident Pill */}
              <div className="flex items-center gap-1.5">
                {emergencyCount > 0 && (
                  <span
                    title={`${emergencyCount} Emergency SLA issue`}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/50 animate-pulse"
                  >
                    <Flame className="h-3 w-3 fill-current" />
                  </span>
                )}

                {openCount > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      emergencyCount > 0
                        ? "bg-[#ff3b30] text-white shadow-sm shadow-[#ff3b30]/50"
                        : isSelected
                        ? "bg-[#58a6ff] text-black"
                        : "bg-[#30363d] text-gray-200"
                    }`}
                  >
                    {openCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">0</span>
                )}

                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    isSelected ? "text-[#58a6ff] translate-x-0.5" : "text-gray-600 opacity-0 group-hover:opacity-100"
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
