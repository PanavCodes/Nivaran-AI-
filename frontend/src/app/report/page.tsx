"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ClipboardList,
  ImagePlus,
  Layers,
  Loader2,
  MapPin,
  Send,
  X,
  Sparkles,
  Scan,
  ThumbsUp,
  Shield,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { sound } from "@/lib/sound";

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
  const [planTheme, setPlanTheme] = useState<"dark" | "light">("dark");
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reinforcingId, setReinforcingId] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  const handleScanLocation = ({ floor: f, room, x, y }: { floor: string; room: string; x: number; y: number }) => {
    sound.playSuccess();
    setFloor(f);
    setRoomOrZone(room);
    setCoords({ x, y });
    toast.success(`Door QR Scanned: ${room} on Floor ${f}!`, { icon: "🎯" });
  };

  const handleVoiceTranscript = (text: string) => {
    sound.playRadarPing();
    setDescription((prev) => (prev ? prev + " " + text : text));
    if (!title) {
      const words = text.split(" ").slice(0, 8).join(" ");
      setTitle(words.charAt(0).toUpperCase() + words.slice(1));
    }
    toast.success("Voice transcript captured! Gemini categorizing…", { icon: "🎙️" });
  };

  const handleReinforceCluster = async (clusterId: string, clusterTitle: string) => {
    setReinforcingId(clusterId);
    sound.playClick();
    try {
      await api.post(`/api/v1/clusters/${clusterId}/reinforce`, {});
      sound.playSuccess();
      toast.success(`+1 Reinforced '${clusterTitle}'! Urgency escalated for campus technicians.`, { icon: "🔥" });
      refreshNearby();
    } catch {
      toast.error("Could not reinforce cluster. Please try submitting a report.");
    } finally {
      setReinforcingId(null);
    }
  };


  useEffect(() => {
    requireAuth();
  }, []);

  // ── "Nearby Active Clusters on Current Floor" — queries /clusters/nearby ──
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
        // If room matches a known room on this floor, center coords
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
        toast.info(`Sign / room text detected: "${ai.ocr_text}"`);
      }
      if (detected.floor || detected.room) {
        setAiDetected(detected);
      }
    } catch {
      // Intake AI optional at this stage — fields stay manual
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
    sound.playRadarPing();
    setCoords({ x, y });
    if (room) {
      setRoomOrZone(room.name);
      toast.info(`Location pinned near ${room.name} (${x}, ${y})`, { duration: 2500 });
    } else {
      toast.info(`Location pinned at canvas (${x}, ${y})`, { duration: 2000 });
    }
  };

  // Handle room dropdown selection
  const handleRoomSelect = (roomName: string) => {
    sound.playRadarPing();
    setRoomOrZone(roomName);
    const currentMeta = getFloorMeta(floor);
    const match = currentMeta.rooms.find((r) => r.name === roomName);
    if (match) {
      setCoords({ x: match.x, y: match.y });
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sound.playClick();
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
      sound.playSuccess();
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
    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent";

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />

      <main className="radar-canvas flex-1 p-4 md:p-8 relative">
        <div className="radar-sweep opacity-25 pointer-events-none" />

        <div className="relative z-10 mx-auto mt-2 grid max-w-6xl gap-5 lg:grid-cols-[1fr_340px]">

        {/* ── Smart Report Form ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">Report a campus problem</h1>
                  <p className="mt-1 text-sm text-[#8b949e]">
                    Attach a photo — Gemini reads room numbers, signs, and pinpoints your floor plan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VoiceIntakeButton onTranscript={handleVoiceTranscript} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQrOpen(true)}
                    className="border-accent/40 text-accent hover:bg-accent/10 flex items-center gap-1.5 text-xs h-8"
                  >
                    <Scan size={13} /> Door QR
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
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-[#30363d] hover:border-accent/50"
                }`}
              >
                {preview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Attachment preview" className="max-h-44 rounded-lg" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                        setAiDetected(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-emergency p-1 text-white shadow-lg"
                      aria-label="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="text-accent" size={28} />
                    <p className="mt-2 text-sm text-[#c9d1d9]">
                      Drag & drop a photo/video, or <span className="text-accent">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-[#8b949e]">
                      Gemini Vision detects room numbers, door signs & damage severity
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
                    <div className="shimmer flex items-center gap-2 rounded-lg p-3 text-sm text-accent">
                      <Sparkles size={16} className="animate-spin" />
                      Analyzing indoor visual signals (floor, door number, OCR)…
                    </div>
                  </motion.div>
                )}

                {aiDetected && !analyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent"
                  >
                    <Sparkles size={14} />
                    <span>Gemini auto-detected:</span>
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
                      <span className="truncate italic text-[#c9d1d9]">&ldquo;{aiDetected.ocr}&rdquo;</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={field}
                  placeholder="Short title — e.g. AC leaking water near Room 104"
                />
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={field}
                  placeholder="Describe the problem — what, where exactly, since when…"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                      Category
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
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                      Severity — {severity}/5
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={severity}
                      onChange={(e) => setSeverity(Number(e.target.value))}
                      className="mt-2.5 w-full accent-[#58a6ff]"
                    />
                  </div>
                </div>

                {/* ── Indoor Location: Floor Selector & Room Picker ── */}
                <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Building size={14} className="text-accent" /> Indoor Location (Floor & Room)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPlanTheme(planTheme === "dark" ? "light" : "dark")}
                        className="rounded px-2 py-0.5 text-[10px] text-[#8b949e] hover:bg-white/5 hover:text-white"
                      >
                        {planTheme === "dark" ? "Light blueprint" : "Dark blueprint"}
                      </button>
                    </div>
                  </div>

                  {/* Floor Selector Pills */}
                  <div className="mt-3">
                    <span className="text-[10px] uppercase tracking-wide text-[#8b949e]">
                      Select Floor (10-Storey Facility)
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
                              className={`rounded-md py-1.5 text-xs font-bold transition ${
                                isSelected
                                  ? "bg-accent text-[#0d1117] shadow-sm"
                                  : "border border-[#30363d] bg-[#0d1117] text-[#c9d1d9] hover:border-accent/40"
                              }`}
                            >
                              {fId}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Room Quick-Picker with search filter */}
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] uppercase tracking-wide text-[#8b949e]">
                          Room / Zone Quick Select
                        </label>
                        <span className="text-[10px] text-[#58a6ff] font-mono">
                          {availableRooms.length} Rooms
                        </span>
                      </div>
                      <div className="relative mb-2">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-[#8b949e]" />
                        <input
                          type="text"
                          value={roomSearchQuery}
                          onChange={(e) => setRoomSearchQuery(e.target.value)}
                          placeholder="Filter rooms (e.g. Lab, Server)…"
                          className="w-full rounded-md border border-[#30363d] bg-[#0d1117] pl-7 pr-2 py-1.5 text-xs text-white outline-none focus:border-[#58a6ff]"
                        />
                      </div>
                      <select
                        value={availableRooms.some((r) => r.name === roomOrZone) ? roomOrZone : ""}
                        onChange={(e) => e.target.value && handleRoomSelect(e.target.value)}
                        className={field}
                      >
                        <option value="">Choose a room on Floor {floor}…</option>
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
                      <label className="mb-1 block text-[10px] uppercase tracking-wide text-[#8b949e]">
                        Custom Room / Zone Name
                      </label>
                      <input
                        type="text"
                        value={roomOrZone}
                        onChange={(e) => setRoomOrZone(e.target.value)}
                        placeholder="e.g. Room 104, North Staircase…"
                        className={field}
                      />
                    </div>
                  </div>


                  {/* Interactive Floor Plan Viewer */}
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#8b949e]">
                      <span className="flex items-center gap-1 text-accent">
                        <MapPin size={12} /> Click anywhere on blueprint to pinpoint exact spot:
                      </span>
                      <span className="font-mono text-[#c9d1d9]">
                        Floor {floor} · ({Math.round(coords.x)}, {Math.round(coords.y)})
                      </span>
                    </div>

                    <div className="relative overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
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

                {/* Whistleblower Mode toggle (CivicLens) */}
                <div className="flex items-center justify-between rounded-lg border border-[#21262d] bg-[#0d1117] p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-400" />
                    <div>
                      <span className="font-semibold text-white">Whistleblower / Anonymous Mode</span>
                      <p className="text-[11px] text-[#8b949e]">
                        Conceals your student ID and name from technician and public audit logs
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>

                <Button type="submit" disabled={submitting || analyzing} className="w-full">
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={15} />
                  )}
                  {submitting ? "Processing intake…" : "Submit Report"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Real-time floating sidebar: Nearby Active Clusters on Floor ── */}
        <motion.aside initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="sticky top-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-high opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-high" />
                  </span>
                  Nearby Clusters
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  Floor {floor}
                </Badge>
              </div>

              <p className="mt-1 text-xs text-[#8b949e]">
                Live issues on Floor {floor} within clustering radius (35 canvas units).
              </p>

              <div className="mt-4 space-y-3">
                {nearby.length === 0 && (
                  <div className="rounded-xl border border-[#21262d] bg-[#161b22]/50 p-4 text-center">
                    <Layers size={22} className="mx-auto text-[#8b949e]/50" />
                    <p className="mt-2 text-xs text-[#8b949e]">
                      No active clusters near this spot on Floor {floor}. You will be the primary
                      reporter!
                    </p>
                  </div>
                )}
                {nearby.map((c) => (
                  <div
                    key={c.cluster_id}
                    className="glow-amber rounded-xl border border-high/25 bg-high/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-white line-clamp-1">{c.title}</span>
                      <Badge variant="high" className="shrink-0 text-[10px]">
                        ~{Math.round(c.distance_units)} units
                      </Badge>
                    </div>
                    {c.room_or_zone && (
                      <p className="mt-1 text-[11px] font-mono text-accent">
                        Zone: {c.room_or_zone}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#c9d1d9]">
                      {c.complaint_count} {c.complaint_count === 1 ? "student" : "students"} reported
                      this. Submitting will reinforce this cluster (Priority +
                      {3.5 * Math.min(10, c.complaint_count + 1)}).
                    </p>
                    {/* Me Too / Upvote Reinforce button (CampFeed / Civic-Fix) */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={reinforcingId === c.cluster_id}
                      onClick={() => handleReinforceCluster(c.cluster_id, c.title)}
                      className="mt-2.5 w-full border-high/40 text-high hover:bg-high/15 flex items-center justify-center gap-1.5 text-xs h-7"
                    >
                      {reinforcingId === c.cluster_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={12} />
                      )}
                      Me Too (+1 Reinforce)
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
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-resolved" size={44} />
            <h3 className="mt-3 text-lg font-bold text-white">
              {result.merged ? "Report reinforced an existing cluster" : "Report registered"}
            </h3>
            <p className="mt-1 text-sm text-[#8b949e]">{result.message}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8b949e]">Cluster</div>
                <div
                  className="mt-1 truncate text-xs font-mono text-accent"
                  title={result.cluster_id}
                >
                  #{result.cluster_id.slice(0, 8)}
                </div>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8b949e]">Priority</div>
                <div className="mt-1 text-sm font-bold text-white">{result.priority_score}</div>
              </div>
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8b949e]">Tier</div>
                <div className="mt-1">
                  <Badge
                    variant={
                      tierVariant[result.sla_tier as keyof typeof tierVariant] ?? "default"
                    }
                  >
                    {result.sla_tier}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs">
              <span className="text-[#8b949e]">Indoor Location:</span>
              <span className="font-semibold text-white">
                Floor {result.floor || floor}
                {result.room_or_zone ? ` · ${result.room_or_zone}` : ""}
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-left">
              <div className="flex items-center justify-between text-xs text-[#8b949e]">
                <span>Projected SLA deadline</span>
                <span className="font-mono text-[#c9d1d9]">
                  {new Date(result.sla_deadline).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Progress
                value={Math.min(100, (result.priority_score / 100) * 100)}
                className="mt-2"
                barClassName={
                  result.sla_tier === "EMERGENCY"
                    ? "bg-emergency"
                    : result.sla_tier === "HIGH"
                      ? "bg-high"
                      : "bg-resolved"
                }
              />
            </div>
            {result.reasoning && (
              <p className="mt-3 flex items-start gap-1.5 text-left text-xs text-[#8b949e]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-high" />{" "}
                {result.reasoning}
              </p>
            )}
            <Link
              href="/tracker"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
              onClick={() => setResult(null)}
            >
              <ClipboardList size={15} /> Track this report
            </Link>
          </div>
        )}
      </Dialog>

      {/* Door QR Scanner Modal (SIPOR-MA) */}
      <QrCodeScannerModal
        open={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onScanLocation={handleScanLocation}
      />
      </main>
    </div>
  );
}

