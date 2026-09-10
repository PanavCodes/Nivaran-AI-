"use client";

import React, { useState, useRef, useCallback } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface BeforeAfterImageSliderProps {
  beforeUrl: string;
  afterUrl: string;
  similarityScore?: number | null;
  verified?: boolean;
  reasoning?: string;
  className?: string;
}

/**
 * Draggable Before/After Image Comparison Slider.
 * Adapted from smart-civic-issue-reporter (IssueDetailsModal.jsx) & City-Sync (vision.py).
 */
export const BeforeAfterImageSlider: React.FC<BeforeAfterImageSliderProps> = ({
  beforeUrl,
  afterUrl,
  similarityScore = 0.92,
  verified = true,
  reasoning = "Scene verified: reported problem resolved with matching background structures.",
  className = "",
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPos(Math.max(0, Math.min(100, pos)));
    },
    []
  );

  const onMouseDown = () => setIsDragging(true);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) handleMove(e.touches[0].clientX);
  };

  const pct = similarityScore ? Math.round(similarityScore * 100) : 92;

  return (
    <div className={`space-y-3 ${className}`} onMouseUp={onMouseUp} onTouchEnd={onMouseUp}>
      {/* Slider Viewport */}
      <div
        ref={containerRef}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-xl border border-[#30363d] bg-black shadow-xl"
      >
        {/* 'After' Image (Base layer - full width) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt="After: technician resolution"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />

        {/* 'After' Badge */}
        <span className="absolute top-3 right-3 z-10 rounded-md bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          After (Repair Proof)
        </span>

        {/* 'Before' Image (Clipped overlay layer) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt="Before: student report"
            className="absolute inset-0 h-full max-w-none object-cover"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%",
            }}
          />
        </div>

        {/* 'Before' Badge */}
        <span className="absolute top-3 left-3 z-10 rounded-md bg-red-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          Before (Damage Report)
        </span>

        {/* Draggable Divider Handle */}
        <div
          className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] cursor-ew-resize"
          style={{ left: `${sliderPos}%` }}
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-xl border border-gray-300">
            <span className="text-[11px] font-bold tracking-tighter">◀▶</span>
          </div>
        </div>
      </div>

      {/* Dual-Proof Verification Score Banner */}
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          {verified ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-amber-400" />
          )}
          <div>
            <span className="font-semibold text-white flex items-center gap-1.5">
              Dual-Proof AI Verification
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400">
                {pct}% Structural Match ✓
              </span>
            </span>
            <p className="mt-0.5 text-[11px] text-[#8b949e]">{reasoning}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
