"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ImagePlus,
  Loader2,
  LogOut,
  Radar,
  Send,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { logout, requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { NearbyCluster } from "@/lib/types";

const CATEGORIES = ["IT_SUPPORT", "MAINTENANCE", "HOUSEKEEPING", "FACILITIES", "ADMINISTRATION"];
const CAMPUS = { lat: 18.922, lon: 72.8347 };

interface SubmissionResult {
  complaint_id: string;
  cluster_id: string;
  cluster_title: string;
  merged: boolean;
  category: string;
  priority_score: number;
  sla_tier: string;
  sla_deadline: string;
  complaint_count: number;
  reasoning: string;
  message: string;
}

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;

export default function ReportPortal() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("MAINTENANCE");
  const [severity, setSeverity] = useState(3);
  const [coords, setCoords] = useState({ lat: CAMPUS.lat, lon: CAMPUS.lon });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [nearby, setNearby] = useState<NearbyCluster[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requireAuth();
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {}, // campus default retained if permission denied
    );
  }, []);

  // ── "Nearby Active Clusters" — queries /clusters/nearby as the user types ──
  const refreshNearby = useCallback(async (q?: string) => {
    try {
      const data = await api.get<NearbyCluster[]>(
        `/api/v1/clusters/nearby?lat=${coords.lat}&lon=${coords.lon}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      );
      setNearby(data);
    } catch {}
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    refreshNearby();
  }, [refreshNearby]);

  // Debounced lookup keyed on description text
  useEffect(() => {
    if (descTimer.current) clearTimeout(descTimer.current);
    if (description.trim().length < 4) return;
    descTimer.current = setTimeout(() => refreshNearby(description.split(" ").slice(0, 4).join(" ")), 500);
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
    try {
      // Read visible text via Gemini through a probe submission-less intake call:
      // we run the AI analysis client-side pre-fill using the complaint intake AI
      // via a tiny request to the backend analysis endpoint.
      const fd = new FormData();
      fd.append("image", f);
      const ai = await api.post<{ category: string; severity: number; ocr_text: string | null }>(
        "/api/v1/complaints/analyze",
        fd,
      );
      if (ai.category && CATEGORIES.includes(ai.category)) setCategory(ai.category);
      if (ai.severity >= 1 && ai.severity <= 5) setSeverity(ai.severity);
      if (ai.ocr_text) toast.info(`Sign text detected: "${ai.ocr_text}"`);
    } catch {
      // Intake AI optional at this stage — fields stay manual
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("latitude", String(coords.lat));
      fd.append("longitude", String(coords.lon));
      if (file) fd.append("image", file);
      const res = await api.post<SubmissionResult>("/api/v1/complaints", fd);
      setResult(res);
      setTitle("");
      setDescription("");
      setFile(null);
      setPreview(null);
      refreshNearby();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent";

  return (
    <main className="radar-canvas min-h-screen p-4 md:p-8">
      <div className="radar-sweep opacity-25" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="text-accent" size={22} />
          <span className="font-bold tracking-tight text-white">Nivaran · Radar Intake</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/tracker">
            <Button variant="ghost" className="text-sm">
              <ClipboardList size={15} /> My Reports
            </Button>
          </Link>
          <Button variant="ghost" onClick={logout} className="text-sm">
            <LogOut size={15} /> Sign out
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto mt-6 grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Smart Report Form ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <h1 className="text-xl font-bold text-white">Report a campus problem</h1>
              <p className="mt-1 text-sm text-[#8b949e]">
                Attach a photo — the intake AI reads room numbers and signs, and pre-fills the form.
              </p>

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
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                  dragOver ? "border-accent bg-accent/5" : "border-[#30363d] hover:border-accent/50"
                }`}
              >
                {preview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Attachment preview" className="max-h-40 rounded-lg" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreview(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-emergency p-1 text-white"
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
                    <p className="mt-1 text-xs text-[#8b949e]">Gemini Vision reads room numbers & signs</p>
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
                    <div className="shimmer rounded-lg p-3 text-sm text-accent">
                      Analyzing multi-modal signals…
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Short title — e.g. Leaking pipe in library" />
                <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={field} placeholder="Describe the problem — what, where exactly, since when…" />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                      Severity — {severity}/5
                    </label>
                    <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="mt-2.5 w-full accent-[#58a6ff]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Latitude</label>
                    <input type="number" step="0.000001" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })} className={field} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">Longitude</label>
                    <input type="number" step="0.000001" value={coords.lon} onChange={(e) => setCoords({ ...coords, lon: Number(e.target.value) })} className={field} />
                  </div>
                </div>

                <Button type="submit" disabled={submitting || analyzing} className="w-full">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
                  {submitting ? "Submitting…" : "Submit Report"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Real-time floating sidebar: Nearby Active Clusters ── */}
        <motion.aside initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="sticky top-6">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="relative flex h-2 w-2">
                  <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-high opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-high" />
                </span>
                Nearby Active Clusters
              </h2>
              <div className="mt-4 space-y-3">
                {nearby.length === 0 && (
                  <p className="text-sm text-[#8b949e]">
                    No open clusters within ~550 m. You&apos;re likely the first to report — submit and
                    seed the map.
                  </p>
                )}
                {nearby.map((c) => (
                  <div key={c.cluster_id} className="glow-amber rounded-xl border border-high/20 bg-high/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{c.title}</span>
                      <Badge variant="high">{Math.round(c.distance_m)} m</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#c9d1d9]">
                      {c.complaint_count} {c.complaint_count === 1 ? "student" : "students"} already reported this — your report
                      reinforces this cluster (Priority +{3.5 * Math.min(10, c.complaint_count + 1)}).
                    </p>
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
                <div className="mt-1 truncate text-xs font-mono text-accent" title={result.cluster_id}>
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
                  <Badge variant={tierVariant[result.sla_tier as keyof typeof tierVariant] ?? "default"}>
                    {result.sla_tier}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-left">
              <div className="flex items-center justify-between text-xs text-[#8b949e]">
                <span>Projected SLA deadline</span>
                <span className="font-mono text-[#c9d1d9]">
                  {new Date(result.sla_deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <Progress
                value={Math.min(100, (result.priority_score / 100) * 100)}
                className="mt-2"
                barClassName={
                  result.sla_tier === "EMERGENCY" ? "bg-emergency" : result.sla_tier === "HIGH" ? "bg-high" : "bg-resolved"
                }
              />
            </div>
            {result.reasoning && (
              <p className="mt-3 flex items-start gap-1.5 text-left text-xs text-[#8b949e]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-high" /> {result.reasoning}
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
    </main>
  );
}
