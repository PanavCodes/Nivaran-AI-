"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ORDERED_FLOOR_IDS, getFloorMeta } from "@/lib/campus_floors";
import { QrCode, Scan, Building } from "lucide-react";

interface QrCodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanLocation: (location: { floor: string; room: string; x: number; y: number }) => void;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  open,
  onClose,
  onScanLocation,
}) => {
  const [selectedFloorTab, setSelectedFloorTab] = useState("1");
  const meta = getFloorMeta(selectedFloorTab);

  const handleSelectRoom = (r: { name: string; x: number; y: number }) => {
    onScanLocation({
      floor: selectedFloorTab,
      room: r.name,
      x: r.x,
      y: r.y,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-2 text-left">
        <div className="flex items-center gap-2 border-b border-[#30363d] pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Scan size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              Room Door QR Code Auto-Lookup
              <Badge variant="accent" className="text-[9px]">SIPOR-MA</Badge>
            </h3>
            <p className="text-xs text-[#8b949e]">
              Scan a classroom, lab, or zone door QR plaque to pinpoint exact indoor coordinates.
            </p>
          </div>
        </div>

        {/* Simulated Scanner Viewport */}
        <div className="mt-4 relative overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-b from-[#0d1117] to-[#161b22] p-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-accent/60 bg-accent/5">
            <QrCode size={40} className="text-accent animate-pulse" />
          </div>
          <p className="mt-2 text-xs font-medium text-[#c9d1d9]">
            Camera QR auto-reader active
          </p>
          <p className="text-[10px] text-[#8b949e]">
            Select any room door tag below to simulate a live QR scan on campus:
          </p>
        </div>

        {/* Floor Selection Bar */}
        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-wide text-[#8b949e] font-semibold flex items-center gap-1">
            <Building size={11} /> Filter Door Codes by Floor
          </span>
          <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1.5 custom-scrollbar">
            {ORDERED_FLOOR_IDS.slice().reverse().map((fId) => (
              <button
                key={fId}
                type="button"
                onClick={() => setSelectedFloorTab(fId)}
                className={`shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition ${
                  selectedFloorTab === fId
                    ? "bg-accent text-[#0d1117]"
                    : "border border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:text-white"
                }`}
              >
                Floor {fId}
              </button>
            ))}
          </div>
        </div>

        {/* Room QR Tags Grid */}
        <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {meta.rooms.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#8b949e]">
              No designated room tags on Floor {selectedFloorTab}.
            </div>
          ) : (
            meta.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room)}
                className="w-full flex items-center justify-between rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-white transition hover:border-accent hover:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <QrCode size={14} className="text-accent" />
                  <span className="font-semibold">{room.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#8b949e]">
                  <span>Canvas ({room.x}, {room.y})</span>
                  <Badge variant="outline" className="text-[9px]">Scan Door</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
