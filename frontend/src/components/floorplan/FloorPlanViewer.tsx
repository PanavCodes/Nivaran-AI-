"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cluster, TIER_COLORS, tierForScore } from "@/lib/types";
import { findClosestRoom, getFloorMeta, RoomZone } from "@/lib/campus_floors";
import { CheckCircle2, Flame, MapPin } from "lucide-react";

interface FloorPlanViewerProps {
  floor: string;
  theme?: "dark" | "light";
  clusters?: Cluster[];
  selectedClusterId?: string | null;
  activePin?: { x: number; y: number; room?: string | null } | null;
  interactive?: boolean;
  onPinSelect?: (coords: { x: number; y: number; room: RoomZone | null }) => void;
  onClusterSelect?: (cluster: Cluster) => void;
  className?: string;
  showRoomLabels?: boolean;
  heatmapMode?: boolean;
}

export const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({
  floor,
  theme = "dark",
  clusters = [],
  selectedClusterId = null,
  activePin = null,
  interactive = false,
  onPinSelect,
  onClusterSelect,
  className = "",
  showRoomLabels = false,
  heatmapMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCluster, setHoveredCluster] = useState<Cluster | null>(null);

  const floorMeta = getFloorMeta(floor);
  const svgUrl = theme === "dark" ? floorMeta.svgDark : floorMeta.svgLight;

  // Filter clusters strictly to this floor
  const floorClusters = clusters.filter(
    (c) => c.floor.toUpperCase() === floor.toUpperCase()
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current || !onPinSelect) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 360;
    const clickY = ((e.clientY - rect.top) / rect.height) * 534;

    const clampedX = Math.max(0, Math.min(360, Math.round(clickX * 10) / 10));
    const clampedY = Math.max(0, Math.min(534, Math.round(clickY * 10) / 10));

    const room = findClosestRoom(floor, clampedX, clampedY);
    onPinSelect({ x: clampedX, y: clampedY, room });
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border border-[#30363d] bg-[#0d1117] p-4 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Floor Plan Header Overlay */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 rounded-lg bg-[#161b22]/90 px-3 py-1.5 backdrop-blur-md border border-[#30363d]">
        <span className="flex h-2.5 w-2.5 rounded-full bg-[#58a6ff] animate-pulse" />
        <span className="text-xs font-semibold tracking-wider text-[#58a6ff] uppercase">
          {floorMeta.label}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-300">
          {floorClusters.length} Active Incident{floorClusters.length === 1 ? "" : "s"}
        </span>
      </div>

      {interactive && (
        <div className="absolute top-3 right-4 z-20 hidden sm:flex items-center gap-1.5 rounded-lg bg-[#161b22]/90 px-2.5 py-1 text-[11px] text-gray-400 border border-[#30363d]">
          <MapPin className="h-3 w-3 text-[#58a6ff]" />
          Click floor plan to pinpoint location
        </div>
      )}

      {/* SOS Emergency Flame Banner when Priority >= 75 exists on this floor */}
      {floorClusters.some((c) => c.priority_score >= 75) && (
        <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-between rounded-lg bg-red-600/90 px-3 py-1 text-xs font-semibold text-white shadow-lg animate-pulse backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <Flame size={14} className="animate-bounce text-yellow-300" />
            CRITICAL INCIDENT ON THIS FLOOR
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider bg-black/30 px-1.5 py-0.5 rounded">
            Emergency Priority
          </span>
        </div>
      )}

      {/* Main Vector Canvas Container with Fixed Aspect Ratio (360 x 534) */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={`relative aspect-[360/534] w-full max-w-[420px] select-none rounded-lg overflow-hidden border border-[#21262d] bg-[#161b22] ${
          interactive ? "cursor-crosshair" : "cursor-default"
        }`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(88, 166, 255, 0.05) 0%, transparent 70%)`,
        }}
      >
        {/* Floor Plan SVG Vector Base Layer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgUrl}
          alt={`${floorMeta.label} Layout`}
          className="h-full w-full object-contain pointer-events-none transition-opacity duration-300"
        />

        {/* Optional Room Zone Overlay Labels for Accessibility */}
        {showRoomLabels && (
          <div className="absolute inset-0 pointer-events-none">
            {floorMeta.rooms.map((r, idx) => (
              <div
                key={idx}
                className="absolute text-[8px] text-gray-500/80 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap"
                style={{
                  left: `${(r.x / 360) * 100}%`,
                  top: `${(r.y / 534) * 100}%`,
                }}
              >
                {r.name}
              </div>
            ))}
          </div>
        )}

        {/* SVG Heatmap Density Layer (Smart Campus Intelligence Hub) */}
        {heatmapMode && floorClusters.length > 0 && (
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none z-10"
            viewBox="0 0 360 534"
          >
            <defs>
              <filter id="heat-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="18" result="blur" />
              </filter>
            </defs>
            {floorClusters.map((c, i) => {
              const isEmerg = c.priority_score >= 70;
              return (
                <circle
                  key={`heat-${c.id || i}`}
                  cx={c.x_coord}
                  cy={c.y_coord}
                  r={isEmerg ? 36 : 24}
                  fill={isEmerg ? "rgba(255, 59, 48, 0.55)" : "rgba(255, 204, 0, 0.4)"}
                  filter="url(#heat-blur)"
                />
              );
            })}
          </svg>
        )}

        {/* Spatial 35-Unit Spatio-Semantic Merge Radius Visualizer */}
        {activePin && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none z-20" viewBox="0 0 360 534">
            <circle
              cx={activePin.x}
              cy={activePin.y}
              r={35}
              fill="rgba(88, 166, 255, 0.08)"
              stroke="rgba(88, 166, 255, 0.45)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </svg>
        )}

        {/* User Selected Pin Marker (for Intake / Placement) */}
        {activePin && (
          <motion.div
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-30"
            style={{
              left: `${(activePin.x / 360) * 100}%`,
              top: `${(activePin.y / 534) * 100}%`,
            }}
          >
            <div className="relative flex flex-col items-center">
              <span className="absolute -top-1 h-8 w-8 rounded-full bg-[#58a6ff]/40 animate-ping" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#58a6ff] text-black shadow-lg shadow-[#58a6ff]/50 border-2 border-white">
                <MapPin className="h-4 w-4 fill-current" />
              </div>
              <div className="mt-1 rounded bg-[#0d1117]/95 px-1.5 py-0.5 text-[10px] font-medium text-[#58a6ff] border border-[#58a6ff]/40 shadow whitespace-nowrap">
                {activePin.room || `X:${Math.round(activePin.x)} Y:${Math.round(activePin.y)}`}
              </div>
            </div>
          </motion.div>
        )}


        {/* Active Incident Cluster Markers Overlay */}
        {floorClusters.map((cluster) => {
          const tier = tierForScore(cluster.priority_score);
          const isSelected = selectedClusterId === cluster.id;
          const isEmergency = tier === "EMERGENCY";
          const isResolved = cluster.status === "RESOLVED" || cluster.status === "CLOSED";

          const pinColor = isResolved
            ? TIER_COLORS.LOW
            : TIER_COLORS[tier] || "#58a6ff";

          const xPct = (cluster.x_coord / 360) * 100;
          const yPct = (cluster.y_coord / 534) * 100;

          return (
            <div
              key={cluster.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              onMouseEnter={() => setHoveredCluster(cluster)}
              onMouseLeave={() => setHoveredCluster(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (onClusterSelect) onClusterSelect(cluster);
              }}
            >
              <div className="relative flex items-center justify-center cursor-pointer">
                {/* Emergency Pulsing Ring */}
                {isEmergency && !isResolved && (
                  <span
                    className="absolute h-8 w-8 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: pinColor }}
                  />
                )}

                {/* Selected Accent Halo */}
                {isSelected && (
                  <span
                    className="absolute h-9 w-9 rounded-full border-2 animate-spin"
                    style={{ borderColor: "#58a6ff", borderStyle: "dashed" }}
                  />
                )}

                {/* Central Incident Pin Anchor */}
                <motion.div
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full shadow-lg border-2 border-[#0d1117] transition-all duration-200 ${
                    isSelected ? "ring-2 ring-white scale-110" : ""
                  }`}
                  style={{ backgroundColor: pinColor }}
                >
                  {isResolved ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                  ) : isEmergency ? (
                    <Flame className="h-3.5 w-3.5 text-white animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-bold text-black">
                      {cluster.complaint_count}
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}

        {/* Hover Tooltip Card */}
        <AnimatePresence>
          {hoveredCluster && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute pointer-events-none z-40 w-56 rounded-lg bg-[#161b22]/95 p-3 text-xs shadow-2xl border border-[#30363d] backdrop-blur-md"
              style={{
                left: `${Math.min(70, Math.max(15, (hoveredCluster.x_coord / 360) * 100))}%`,
                top: `${Math.min(75, Math.max(20, (hoveredCluster.y_coord / 534) * 100))}%`,
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black"
                  style={{
                    backgroundColor:
                      hoveredCluster.status === "RESOLVED"
                        ? TIER_COLORS.LOW
                        : TIER_COLORS[tierForScore(hoveredCluster.priority_score)],
                  }}
                >
                  {hoveredCluster.status === "RESOLVED"
                    ? "RESOLVED"
                    : tierForScore(hoveredCluster.priority_score)}
                </span>
                <span className="text-[10px] text-gray-400">
                  Priority {Math.round(hoveredCluster.priority_score)}/100
                </span>
              </div>
              <h4 className="font-semibold text-white truncate">{hoveredCluster.title}</h4>
              <p className="mt-1 text-[11px] text-[#58a6ff]">
                📍 {hoveredCluster.room_or_zone || `Floor ${hoveredCluster.floor}`}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 pt-1.5 border-t border-[#30363d]">
                <span>{hoveredCluster.complaint_count} Report{hoveredCluster.complaint_count === 1 ? "" : "s"}</span>
                <span className="text-[#34c759] font-medium">Click to inspect →</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff3b30]" />
          <span>Emergency (SLA 2h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffcc00]" />
          <span>High (SLA 12h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff9500]" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#34c759]" />
          <span>Resolved</span>
        </div>
      </div>
    </div>
  );
};
