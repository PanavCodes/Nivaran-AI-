"use client";

import React, { useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Cluster, tierForScore } from "@/lib/types";
import { findClosestRoom, getFloorMeta, RoomZone } from "@/lib/campus_floors";
import { CheckCircle2, AlertCircle, MapPin } from "lucide-react";

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
  theme = "light",
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
      className={`relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs overflow-hidden ${className}`}
    >
      {/* Floor Plan Header Overlay */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 backdrop-blur-md border border-slate-200 shadow-2xs">
        <span className="h-2 w-2 rounded-full bg-indigo-600" />
        <span className="text-xs font-bold tracking-tight text-slate-900 uppercase">
          {floorMeta.label}
        </span>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs font-medium text-slate-600">
          {floorClusters.length} Active Incident{floorClusters.length === 1 ? "" : "s"}
        </span>
      </div>

      {interactive && (
        <div className="absolute top-3 right-4 z-20 hidden sm:flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 shadow-2xs">
          <MapPin className="h-3.5 w-3.5 text-indigo-600" />
          Click to place incident marker
        </div>
      )}

      {/* Clean SLA Attention Notice if Priority >= 75 */}
      {floorClusters.some((c) => c.priority_score >= 75) && (
        <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 shadow-xs">
          <span className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-600" />
            High-Priority Incident on this floor
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider bg-red-100/70 text-red-800 px-1.5 py-0.5 rounded">
            Immediate Response
          </span>
        </div>
      )}

      {/* Main Vector Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className={`relative aspect-[360/534] w-full max-w-[420px] select-none rounded-lg overflow-hidden border border-slate-200 bg-slate-50 ${
          interactive ? "cursor-crosshair" : "cursor-default"
        }`}
      >
        {/* Floor Plan SVG Vector Base Layer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgUrl}
          alt={`${floorMeta.label} Layout`}
          className="h-full w-full object-contain pointer-events-none transition-opacity duration-300"
        />

        {/* Room Zone Overlay Labels (Inspector Badge Mode) */}
        {showRoomLabels && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {floorMeta.rooms.map((r, idx) => (
              <div
                key={idx}
                className="absolute -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap"
                style={{
                  left: `${(r.x / 360) * 100}%`,
                  top: `${(r.y / 534) * 100}%`,
                }}
              >
                <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[8px] font-semibold text-white shadow-xs border border-white/20 backdrop-blur-xs">
                  {r.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SVG Heatmap Density Layer */}
        {heatmapMode && floorClusters.length > 0 && (
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none z-10"
            viewBox="0 0 360 534"
          >
            <defs>
              <filter id="heat-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="16" result="blur" />
              </filter>
            </defs>
            {floorClusters.map((c, i) => {
              const isEmerg = c.priority_score >= 70;
              return (
                <circle
                  key={`heat-${c.id || i}`}
                  cx={c.x_coord}
                  cy={c.y_coord}
                  r={isEmerg ? 32 : 22}
                  fill={isEmerg ? "rgba(220, 38, 38, 0.35)" : "rgba(245, 158, 11, 0.3)"}
                  filter="url(#heat-blur)"
                />
              );
            })}
          </svg>
        )}

        {/* Spatial Radius Visualizer */}
        {activePin && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none z-20" viewBox="0 0 360 534">
            <circle
              cx={activePin.x}
              cy={activePin.y}
              r={35}
              fill="rgba(79, 70, 229, 0.06)"
              stroke="rgba(79, 70, 229, 0.4)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          </svg>
        )}

        {/* User Selected Pin Marker */}
        {activePin && (
          <motion.div
            initial={{ scale: 0, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-30"
            style={{
              left: `${(activePin.x / 360) * 100}%`,
              top: `${(activePin.y / 534) * 100}%`,
            }}
          >
            <div className="relative flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md border-2 border-white">
                <MapPin className="h-4 w-4 fill-current" />
              </div>
              <div className="mt-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow whitespace-nowrap">
                {activePin.room || `X:${Math.round(activePin.x)} Y:${Math.round(activePin.y)}`}
              </div>
            </div>
          </motion.div>
        )}

        {/* Active Incident Cluster Markers */}
        {floorClusters.map((cluster) => {
          const tier = tierForScore(cluster.priority_score);
          const isSelected = selectedClusterId === cluster.id;
          const isEmergency = tier === "EMERGENCY";
          const isResolved = cluster.status === "RESOLVED" || cluster.status === "CLOSED";

          const pinBg = isResolved
            ? "bg-emerald-600"
            : isEmergency
            ? "bg-red-600"
            : tier === "HIGH"
            ? "bg-amber-600"
            : "bg-indigo-600";

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
                {/* Central Incident Pin Anchor */}
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.92 }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full shadow-sm border-2 border-white text-white font-bold transition-all duration-150 ${pinBg} ${
                    isSelected ? "ring-2 ring-indigo-600 ring-offset-2 scale-110" : ""
                  }`}
                >
                  {isResolved ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <span className="text-[10px] font-bold">
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
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute pointer-events-none z-40 w-60 rounded-xl bg-white p-3 text-xs shadow-xl border border-slate-200"
              style={{
                left: `${Math.min(68, Math.max(15, (hoveredCluster.x_coord / 360) * 100))}%`,
                top: `${Math.min(72, Math.max(20, (hoveredCluster.y_coord / 534) * 100))}%`,
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor:
                      hoveredCluster.status === "RESOLVED"
                        ? "#ecfdf5"
                        : hoveredCluster.priority_score >= 70
                        ? "#fef2f2"
                        : "#fef3c7",
                    color:
                      hoveredCluster.status === "RESOLVED"
                        ? "#047857"
                        : hoveredCluster.priority_score >= 70
                        ? "#b91c1c"
                        : "#b45309",
                  }}
                >
                  {hoveredCluster.status === "RESOLVED"
                    ? "RESOLVED"
                    : tierForScore(hoveredCluster.priority_score)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Priority {Math.round(hoveredCluster.priority_score)}/100
                </span>
              </div>
              <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug">{hoveredCluster.title}</h4>
              <p className="mt-1 text-[11px] text-slate-500">
                📍 {hoveredCluster.room_or_zone || `Floor ${hoveredCluster.floor}`}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 font-medium">
                <span>{hoveredCluster.complaint_count} Consolidated Report{hoveredCluster.complaint_count === 1 ? "" : "s"}</span>
                <span className="text-indigo-600 font-semibold">Inspect →</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
          <span>Immediate (&le;2h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>High Priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          <span>Standard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span>Resolved</span>
        </div>
      </div>
    </div>
  );
};
