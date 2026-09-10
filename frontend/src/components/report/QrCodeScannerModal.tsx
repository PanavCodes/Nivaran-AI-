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
      <div className="p-1 text-left text-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Scan size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Door QR Code Lookup
              <Badge variant="accent" className="text-[10px] py-0">SIPOR-MA</Badge>
            </h3>
            <p className="text-xs text-slate-500">
              Scan or select a door QR code plaque to lock indoor floor coordinates.
            </p>
          </div>
        </div>

        {/* Scanner Viewport */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-white shadow-2xs mb-2">
            <QrCode size={32} className="text-indigo-600" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Door Plaque Reader Active
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Select a room zone below to simulate scanning a door plaque:
          </p>
        </div>

        {/* Floor Selection Bar */}
        <div className="mt-4">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
            <Building size={12} /> Select Floor Level
          </span>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {ORDERED_FLOOR_IDS.slice().reverse().map((fId) => (
              <button
                key={fId}
                type="button"
                onClick={() => setSelectedFloorTab(fId)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  selectedFloorTab === fId
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
            <div className="p-4 text-center text-xs text-slate-500">
              No designated room tags on Floor {selectedFloorTab}.
            </div>
          ) : (
            meta.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room)}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 transition hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <QrCode size={14} className="text-indigo-600" />
                  <span className="font-semibold text-slate-800">{room.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span>Coord ({room.x}, {room.y})</span>
                  <Badge variant="outline" className="text-[9px] py-0">Select</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
