"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ImagePlus,
  Layers,
  Loader2,
  MapPin,
  X,
  Shield,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import { QrCodeScannerModal } from "@/components/report/QrCodeScannerModal";
import { VoiceIntakeButton } from "@/components/report/VoiceIntakeButton";
import {
  FLOORS_CONFIG,
  ORDERED_FLOOR_IDS,
  getFloorMeta,
  type RoomZone,
} from "@/lib/campus_floors";
import type { NearbyCluster, SubmissionResult } from "@/lib/types";

const CATEGORIES = ["IT_SUPPORT", "MAINTENANCE", "HOUSEKEEPING", "FACILITIES", "ADMINISTRATION"];

const tierVariant = {
  EMERGENCY: "emergency",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "resolved",
} as const;

export default function ReportPortal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("MAINTENANCE");
  const [severity, setSeverity] = useState(3);

  // Indoor spatial location state
  const [floor, setFloor] = useState("1");
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 180, y: 267 });
  const [roomOrZone, setRoomOrZone] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDetected, setAiDetected] = useState<{
    floor?: string;
    room?: string;
    ocr?: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [nearby, setNearby] = useState<NearbyCluster[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const planTheme: "dark" | "light" = "light";
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScanLocation = ({ floor: f, room, x, y }: { floor: string; room: string; x: number; y: number }) => {
    setFloor(f);
    setRoomOrZone(room);
    setCoords({ x, y });
    toast.success(`Door QR Scanned: ${room} on Floor ${f}`);
  };

  const handleVoiceTranscript = (text: string) => {
    setDescription((prev) => (prev ? prev + " " + text : text));
    if (!title) {
      const words = text.split(" ").slice(0, 8).join(" ");
      setTitle(words.charAt(0).toUpperCase() + words.slice(1));
    }
    toast.success("Voice transcript captured");
  };

  const handleReinforceCluster = async (clusterId: string, clusterTitle: string) => {
    setReinforcingId(clusterId);
    try {
      await api.post(`/api/v1/clusters/${clusterId}/reinforce`, {});
      toast.success(`Reinforced '${clusterTitle}' (+1 urgency)`);
      refreshNearby();
    } catch {
      toast.error("Could not reinforce incident. Please try submitting a report.");
    } finally {
      setReinforcingId(null);
    }
  };

  useEffect(() => {
    requireAuth();
  }, []);

  // ── "Nearby Active Clusters on Current Floor" ──
  const refreshNearby = useCallback(
    async (q?: string) => {
      try {
        const queryParams = new URLSearchParams({
          floor,
          x: String(coords.x),
          y: String(coords.y),
        });
        if (q) queryParams.set("q", q);

        const data = await api.get<NearbyCluster[]>(
          `/api/v1/clusters/nearby?${queryParams.toString()}`
        );
        setNearby(data);
      } catch {
        /* silent */
      }
    },
    [floor, coords.x, coords.y]
  );

  useEffect(() => {
    refreshNearby();
  }, [refreshNearby]);

  // Debounced lookup keyed on description text
  useEffect(() => {
    if (descTimer.current) clearTimeout(descTimer.current);
    if (description.trim().length < 4) return;
    descTimer.current = setTimeout(
      () => refreshNearby(description.split(" ").slice(0, 4).join(" ")),
      500
    );
  }, [description, refreshNearby]);

  // ── Multi-modal AI pre-fill on drop/select ────────────────────────────────
  async function handleFile(f: File) {
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      toast.error("Only image or video files are accepted.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalyzing(true);
    setAiDetected(null);

    try {
      const fd = new FormData();
      fd.append("image", f);
      const ai = await api.post<{
        category: string;
        severity: number;
        ocr_text: string | null;
        floor: string | null;
        room_or_zone: string | null;
        ai_title: string | null;
      }>("/api/v1/complaints/analyze", fd);

      if (ai.category && CATEGORIES.includes(ai.category)) setCategory(ai.category);
      if (ai.severity >= 1 && ai.severity <= 5) setSeverity(ai.severity);
      if (ai.ai_title && !title) setTitle(ai.ai_title);

      const detected: { floor?: string; room?: string; ocr?: string } = {};
      if (ai.floor && Object.keys(FLOORS_CONFIG).includes(ai.floor.toUpperCase())) {
        const detectedFloor = ai.floor.toUpperCase();
        setFloor(detectedFloor);
        detected.floor = detectedFloor;
      }
      if (ai.room_or_zone) {
        setRoomOrZone(ai.room_or_zone);
        detected.room = ai.room_or_zone;
        const currentMeta = getFloorMeta(ai.floor || floor);
        const match = currentMeta.rooms.find(
          (r) => r.name.toLowerCase() === ai.room_or_zone?.toLowerCase()
        );
        if (match) {
          setCoords({ x: match.x, y: match.y });
        }
      }
      if (ai.ocr_text) {
        detected.ocr = ai.ocr_text;
        toast.info(`Sign text detected: "${ai.ocr_text}"`);
      }
      if (detected.floor || detected.room) {
        setAiDetected(detected);
      }
    } catch {
      // Manual input fallback
    } finally {
      setAnalyzing(false);
    }
  }

  // Handle pin placement on floor plan
  const handlePinSelect = ({
    x,
    y,
    room,
  }: {
    x: number;
    y: number;
    room: RoomZone | null;
  }) => {
    setCoords({ x, y });
    if (room) {
      setRoomOrZone(room.name);
      toast.info(`Location set to ${room.name}`);
    } else {
      toast.info(`Location pinned at (${Math.round(x)}, ${Math.round(y)})`);
    }
  };

  // Handle room dropdown selection
  const handleRoomSelect = (roomName: string) => {
    setRoomOrZone(roomName);
    const currentMeta = getFloorMeta(floor);
    const match = currentMeta.rooms.find((r) => r.name === roomName);
    if (match) {
      setCoords({ x: match.x, y: match.y });
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("floor", floor);
      fd.append("x_coord", String(coords.x));
      fd.append("y_coord", String(coords.y));
      if (roomOrZone.trim()) fd.append("room_or_zone", roomOrZone.trim());
      fd.append("is_anonymous", String(isAnonymous));
      if (file) fd.append("image", file);

      const res = await api.post<SubmissionResult>("/api/v1/complaints", fd);
      setResult(res);
      setTitle("");
      setDescription("");
      setFile(null);
      setPreview(null);
      setAiDetected(null);
      refreshNearby();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const currentFloorMeta = getFloorMeta(floor);
  const availableRooms = currentFloorMeta.rooms;

  const field =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* ── Smart Report Form ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-slate-200 bg-white shadow-xs">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Submit an Incident Report</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Attach a photo to auto-detect location, or place an exact pin on the campus blueprint.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoiceIntakeButton onTranscript={handleVoiceTranscript} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsQrOpen(true)}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-9 px-3"
                    >
                      Scan door QR
                    </Button>
                  </div>
                </div>

                {/* Drag-and-drop zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {preview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Attachment preview" className="max-h-44 rounded-lg shadow-sm border border-slate-200" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                          setAiDetected(null);
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white shadow-md hover:bg-slate-800"
                        aria-label="Remove attachment"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-2">
                        <ImagePlus size={20} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drag & drop photo or video, or <span className="text-indigo-600">browse</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Automatically detects room numbers, door signage, and incident context
                      </p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                <AnimatePresence>
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs font-medium text-indigo-700">
                        <Loader2 size={15} className="animate-spin text-indigo-600" />
                        Analyzing visual signals (floor signs, door numbers, severity)…
                      </div>
                    </motion.div>
                  )}

                  {aiDetected && !analyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3.5 py-2.5 text-xs text-indigo-800"
                    >
                      <span className="font-semibold text-slate-800">Detected location:</span>
                      {aiDetected.floor && (
                        <Badge variant="accent" className="text-[10px]">
                          Floor {aiDetected.floor}
                        </Badge>
                      )}
                      {aiDetected.room && (
                        <Badge variant="outline" className="text-[10px]">
                          {aiDetected.room}
                        </Badge>
                      )}
                      {aiDetected.ocr && (
                        <span className="truncate italic text-slate-600">&ldquo;{aiDetected.ocr}&rdquo;</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Incident Summary
                    </label>
                    <input
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={field}
                      placeholder="e.g. Water leak near switchboard in Server Room"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Detailed Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={field}
                      placeholder="Provide additional details — exact location, symptoms, urgency…"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Department Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={field}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700">
                          Severity Level
                        </label>
                        <span className="text-xs font-bold text-slate-900">{severity} / 5</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={severity}
                        onChange={(e) => setSeverity(Number(e.target.value))}
                        className="mt-2 w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ── Indoor Location: Floor Selector & Room Picker ── */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Building size={15} className="text-indigo-600" /> Indoor Spatial Location
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Floor {floor} Selected
                      </span>
                    </div>

                    {/* Floor Selector Pills */}
                    <div className="mt-3">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Building Floor Level:
                      </span>
                      <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                        {ORDERED_FLOOR_IDS.slice()
                          .reverse()
                          .map((fId) => {
                            const isSelected = floor === fId;
                            return (
                              <button
                                key={fId}
                                type="button"
                                onClick={() => {
                                  setFloor(fId);
                                  const fMeta = getFloorMeta(fId);
                                  if (fMeta.rooms.length > 0) {
                                    setRoomOrZone(fMeta.rooms[0].name);
                                    setCoords({ x: fMeta.rooms[0].x, y: fMeta.rooms[0].y });
                                  } else {
                                    setRoomOrZone("");
                                    setCoords({ x: 180, y: 267 });
                                  }
                                }}
                                className={`rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {fId}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Room Quick-Picker */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Room / Zone Preset
                          </label>
                          <span className="text-[10px] text-indigo-600 font-medium">
                            {availableRooms.length} Available
                          </span>
                        </div>
                        <div className="relative mb-2">
                          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            placeholder="Filter rooms…"
                            className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <select
                          value={availableRooms.some((r) => r.name === roomOrZone) ? roomOrZone : ""}
                          onChange={(e) => e.target.value && handleRoomSelect(e.target.value)}
                          className={field}
                        >
                          <option value="">Select a room on Floor {floor}…</option>
                          {availableRooms
                            .filter((r) =>
                              r.name.toLowerCase().includes(roomSearchQuery.toLowerCase())
                            )
                            .map((r) => (
                              <option key={r.id} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                          Specific Location Note
                        </label>
                        <input
                          type="text"
                          value={roomOrZone}
                          onChange={(e) => setRoomOrZone(e.target.value)}
                          placeholder="e.g. Near Door 102, West Corridor"
                          className={field}
                        />
                      </div>
                    </div>

                    {/* Interactive Floor Plan Viewer */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                          <MapPin size={13} /> Click on blueprint to set location pin:
                        </span>
                        <span className="font-mono text-slate-700">
                          Floor {floor} · ({Math.round(coords.x)}, {Math.round(coords.y)})
                        </span>
                      </div>

                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <FloorPlanViewer
                          floor={floor}
                          theme={planTheme}
                          interactive={true}
                          activePin={{ x: coords.x, y: coords.y, room: roomOrZone }}
                          onPinSelect={handlePinSelect}
                          className="h-[340px] w-full"
                          showRoomLabels={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Whistleblower Mode toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Shield size={18} className="text-indigo-600" />
                      <div>
                        <span className="font-bold text-slate-900">Anonymous Reporting</span>
                        <p className="text-[11px] text-slate-500">
                          Hides your user profile and contact details from public records and field technicians.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <Button type="submit" disabled={submitting || analyzing} className="w-full py-2.5 text-xs font-semibold">
                    {submitting ? "Processing report…" : "Submit incident report"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Real-time sidebar: Nearby Active Clusters on Floor ── */}
          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="sticky top-20 border border-slate-200 bg-white shadow-xs">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Nearby Active Issues
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    Floor {floor}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  Existing incidents on Floor {floor} within clustering distance (35 units).
                </p>

                <div className="mt-4 space-y-3">
                  {nearby.length === 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-5 text-center">
                      <Layers size={22} className="mx-auto text-slate-400" />
                      <p className="mt-2 text-xs text-slate-500">
                        No duplicate incidents nearby on this floor. Your submission will initialize a new cluster.
                      </p>
                    </div>
                  )}
                  {nearby.map((c) => (
                    <div
                      key={c.cluster_id}
                      className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</span>
                        <Badge variant="high" className="shrink-0 text-[10px] py-0 px-1.5">
                          ~{Math.round(c.distance_units)} units
                        </Badge>
                      </div>
                      {c.room_or_zone && (
                        <p className="mt-1 text-[11px] font-semibold text-indigo-700">
                          {c.room_or_zone}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-600">
                        {c.complaint_count} {c.complaint_count === 1 ? "person has" : "people have"} reported this.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={reinforcingId === c.cluster_id}
                        onClick={() => handleReinforceCluster(c.cluster_id, c.title)}
                        className="mt-3 w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs h-8 font-medium cursor-pointer"
                      >
                        {reinforcingId === c.cluster_id ? "Confirming…" : "Confirm you are also affected"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.aside>
        </div>

        {/* ── Submission success modal ── */}
        <Dialog open={!!result} onClose={() => setResult(null)}>
          {result && (
            <div className="text-center p-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {result.merged ? "Report Merged into Existing Cluster" : "Incident Successfully Registered"}
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{result.message}</p>
              
              <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Cluster ID</div>
                  <div className="mt-1 truncate text-xs font-mono font-semibold text-indigo-600">
                    #{result.cluster_id.slice(0, 8)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Priority</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{result.priority_score}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">SLA Tier</div>
                  <div className="mt-1">
                    <Badge
                      variant={
                        tierVariant[result.sla_tier as keyof typeof tierVariant] ?? "default"
                      }
                      className="text-[10px] py-0"
                    >
                      {result.sla_tier}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                <span className="text-slate-500 font-medium">Floor Location:</span>
                <span className="font-bold text-slate-900">
                  Floor {result.floor || floor}
                  {result.room_or_zone ? ` · ${result.room_or_zone}` : ""}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left">
                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Projected Resolution SLA</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(result.sla_deadline).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (result.priority_score / 100) * 100)}
                  className="mt-2.5 h-2"
                  barClassName={
                    result.sla_tier === "EMERGENCY"
                      ? "bg-red-600"
                      : result.sla_tier === "HIGH"
                      ? "bg-amber-500"
                      : "bg-emerald-600"
                  }
                />
              </div>
              
              {result.reasoning && (
                <p className="mt-3 text-left text-xs text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>{result.reasoning}</span>
                </p>
              )}

              <Link
                href="/tracker"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                onClick={() => setResult(null)}
              >
                Track this incident
              </Link>
            </div>
          )}
        </Dialog>

        {/* Door QR Scanner Modal */}
        <QrCodeScannerModal
          open={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          onScanLocation={handleScanLocation}
        />
      </main>
    </div>
  );
}
