"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  Shield,
  Wrench,
  X,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { logout, requireAuth, type SessionUser } from "@/lib/auth";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Cluster, ClusterDetail, Complaint } from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;

interface ResolveResult {
  cluster_id: string;
  status: string;
  verified: boolean;
  similarity_score: number | null;
  reasoning: string;
}

export default function TechnicianConsole() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [queue, setQueue] = useState<Cluster[]>([]);
  const [active, setActive] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [techNotes, setTechNotes] = useState("");
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [deferTarget, setDeferTarget] = useState<Cluster | null>(null);
  const [deferReason, setDeferReason] = useState("Waiting for spare parts");
  const [deferOther, setDeferOther] = useState("");
  const [swipeHint, setSwipeHint] = useState<Record<string, "enroute" | "defer">>({});
  const proofRef = useRef<HTMLInputElement>(null);

  const DEFER_REASONS = [
    "Waiting for spare parts",
    "Need admin approval / budget",
    "Access to the area restricted",
    "Escalated to external vendor",
    "Re-scheduled — higher priority emergency",
  ];

  /* ── Field status actions (§1.3 swipes) ── */
  async function handleEnRoute(clusterId: string) {
    try {
      await api.post(`/api/v1/clusters/${clusterId}/status`, { status: "IN_PROGRESS" });
      toast.success("Marked En-Route — status is now In Progress");
      fetchQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "En-Route failed");
    }
  }

  async function handleDefer() {
    if (!deferTarget) return;
    const reason = deferReason === "__other" ? deferOther.trim() : deferReason;
    if (!reason) {
      toast.error("Enter a reason for deferring");
      return;
    }
    try {
      await api.post(`/api/v1/clusters/${deferTarget.id}/status`, { status: "OPEN", reason });
      toast.success(`Deferred — reason logged: ${reason}`);
      setDeferTarget(null);
      setDeferOther("");
      fetchQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Defer failed");
    }
  }

  /* ── Auth gate ── */
  useEffect(() => {
    const u = requireAuth();
    if (u) setUser(u);
  }, []);

  /* ── Fetch task queue ── */
  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.get<Cluster[]>(
        "/api/v1/clusters/active?status=OPEN,ASSIGNED,IN_PROGRESS",
      );
      setQueue(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      setActive(await api.get<ClusterDetail>(`/api/v1/clusters/${id}`));
    } catch {
      toast.error("Failed to load work order");
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  /* ── WebSocket updates ── */
  const onEvent = useCallback(
    (msg: WsMessage) => {
      if (msg.event === "cluster.assigned" || msg.event === "cluster.resolved" || msg.event === "poll.refresh") {
        fetchQueue();
        if (active && msg.data.cluster_id === active.id) {
          fetchDetail(active.id);
        }
      }
    },
    [fetchQueue, fetchDetail, active],
  );

  useWebSocket("technician", onEvent, "/api/v1/clusters/active?status=OPEN,ASSIGNED,IN_PROGRESS");

  /* ── Live countdown timer (1s tick) ── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const slaCountdown = (deadline: string | null) => {
    if (!deadline) return { text: "—", urgent: false, ms: 0 };
    const ms = new Date(deadline).getTime() - now;
    if (ms <= 0) return { text: "BREACHED", urgent: true, ms: 0 };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return {
      text: h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`,
      urgent: ms < 30 * 60 * 1000,
      ms,
    };
  };

  /* ── Handle proof photo ── */
  function handleProofSelect(f: File) {
    if (!f.type.startsWith("image/")) {
      toast.error("Only image files accepted");
      return;
    }
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  }

  /* ── Submit resolution (dual-proof close-out) ── */
  async function handleResolve(clusterId: string) {
    if (!proofFile) {
      toast.error("Capture or upload a proof photo first");
      return;
    }
    setResolving(true);
    try {
      const fd = new FormData();
      fd.append("proof_image", proofFile);
      fd.append("technician_notes", techNotes);
      const res = await api.post<ResolveResult>(`/api/v1/clusters/${clusterId}/resolve`, fd);
      setResolveResult(res);
      if (res.verified) {
        toast.success("Issue resolved — Dual-Proof Verified ✓");
      } else {
        toast.error("Verification failed: " + res.reasoning);
      }
      fetchQueue();
      setActive(null);
      setProofFile(null);
      setProofPreview(null);
      setTechNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resolution failed");
    } finally {
      setResolving(false);
    }
  }

  if (!user) return null;

  return (
    <main className="radar-canvas min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#21262d] bg-[#0d1117]/95 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-high/15">
            <Wrench size={16} className="text-high" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Task Force Terminal</h1>
            <p className="text-[10px] text-[#8b949e]">
              {queue.length} active work order{queue.length !== 1 ? "s" : ""} · {user.full_name}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-xs">
          <LogOut size={14} /> Sign out
        </Button>
      </header>

      <div className="mx-auto max-w-5xl p-4 md:p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : queue.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-resolved/10">
              <CheckCircle2 size={32} className="text-resolved" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">All clear!</h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              No active work orders. New assignments will appear here in real time.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queue.map((cluster, i) => {
              const tier = tierForScore(cluster.priority_score);
              const sla = slaCountdown(cluster.sla_deadline);
              const emergency = tier === "EMERGENCY";
              const hint = swipeHint[cluster.id];

              return (
                <motion.div
                  key={cluster.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  drag="x"
                  dragConstraints={{ left: 120, right: 120 }}
                  dragElastic={0.55}
                  onDragStart={() => setSwipeHint((h) => ({ ...h, [cluster.id]: undefined as never }))}
                  onDrag={(_, info) =>
                    setSwipeHint((h) => ({
                      ...h,
                      [cluster.id]: info.offset.x > 50 ? "enroute" : info.offset.x < -50 ? "defer" : undefined as never,
                    }))
                  }
                  onDragEnd={(_, info) => {
                    setSwipeHint((h) => ({ ...h, [cluster.id]: undefined as never }));
                    if (info.offset.x > 90 && info.velocity.x > 200) handleEnRoute(cluster.id);
                    else if (info.offset.x < -90 && info.velocity.x < -200) setDeferTarget(cluster);
                  }}
                  whileDrag={{ scale: 1.03, cursor: "grabbing" }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition hover:border-accent/40 ${
                      emergency ? "border-emergency/40" : ""
                    } ${hint === "enroute" ? "border-resolved/60" : ""} ${hint === "defer" ? "border-high/60" : ""}`}
                    onClick={() => {
                      if (hint) return; // ignore the click that ends a swipe
                      fetchDetail(cluster.id);
                      setResolveResult(null);
                    }}
                  >
                    <CardContent className="p-4">
                      {/* Swipe affordance row (§1.3: right = En-Route, left = defer) */}
                      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-[#8b949e]/70">
                        <span>⟵ swipe to defer</span>
                        <span>swipe for En-Route ⟶</span>
                      </div>

                      {/* Tier + SLA row */}
                      <div className="flex items-start justify-between">
                        <Badge variant={tierVariant[tier as keyof typeof tierVariant] ?? "default"}>
                          {tier}
                        </Badge>
                        <div
                          className={`flex items-center gap-1 font-mono text-xs font-bold ${
                            sla.urgent ? "flash-red" : "text-[#c9d1d9]"
                          }`}
                        >
                          <Clock size={10} />
                          {sla.text}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3 text-sm font-bold text-white line-clamp-2">
                        {cluster.title}
                      </h3>

                      {/* Meta */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[#8b949e]">
                        <span className="flex items-center gap-0.5">
                          <MapPin size={9} /> {cluster.latitude.toFixed(4)}, {cluster.longitude.toFixed(4)}
                        </span>
                        <span>·</span>
                        <span>{CATEGORY_LABELS[cluster.category] ?? cluster.category}</span>
                        <span>·</span>
                        <span>{cluster.complaint_count} report(s)</span>
                      </div>

                      {/* Priority bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                          <span>Priority</span>
                          <span className="font-mono text-white">{cluster.priority_score}</span>
                        </div>
                        <Progress
                          value={cluster.priority_score}
                          className="mt-1"
                          barClassName={
                            emergency ? "bg-emergency" : tier === "HIGH" ? "bg-high" : tier === "MEDIUM" ? "bg-medium" : "bg-resolved"
                          }
                        />
                      </div>

                      {/* Status */}
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="outline">{cluster.status}</Badge>
                        <ChevronRight size={14} className="text-[#8b949e]" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Work Order Detail Modal ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#21262d] bg-[#0d1117] md:rounded-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#21262d] bg-[#0d1117] p-5">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={tierVariant[tierForScore(active.priority_score) as keyof typeof tierVariant] ?? "default"}>
                      {tierForScore(active.priority_score)}
                    </Badge>
                    <Badge variant="outline">{active.status}</Badge>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-white">{active.title}</h2>
                  <p className="mt-0.5 text-xs text-[#8b949e]">
                    {CATEGORY_LABELS[active.category] ?? active.category} · {active.assigned_department}
                  </p>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="rounded-md p-1.5 text-[#8b949e] hover:bg-white/5 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {/* SLA Countdown */}
                {(() => {
                  const sla = slaCountdown(active.sla_deadline);
                  return (
                    <div
                      className={`flex items-center justify-between rounded-xl border p-4 ${
                        sla.urgent
                          ? "border-emergency/40 bg-emergency/5"
                          : "border-[#21262d] bg-[#161b22]"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm text-[#8b949e]">
                        <Clock size={14} /> SLA Remaining
                      </span>
                      <span
                        className={`font-mono text-lg font-bold ${
                          sla.urgent ? "flash-red" : "text-white"
                        }`}
                      >
                        {sla.text}
                      </span>
                    </div>
                  );
                })()}

                {/* AI Summary */}
                {active.ai_summary && (
                  <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-4">
                    <p className="text-xs font-medium text-accent">AI Summary</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#c9d1d9]">{active.ai_summary}</p>
                  </div>
                )}

                {/* Before Image (from first complaint) */}
                {(() => {
                  const firstComplaint = active.complaints?.[0];
                  if (!firstComplaint?.image_url) return null;
                  const imgUrl = firstComplaint.image_url.startsWith("http")
                    ? firstComplaint.image_url
                    : `${API_URL}${firstComplaint.image_url}`;
                  return (
                    <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-4">
                      <p className="mb-2 text-xs font-medium text-[#8b949e]">Before (Original Report)</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt="Before damage"
                        className="w-full rounded-lg object-cover"
                      />
                    </div>
                  );
                })()}

                {/* Dual-Proof Close-Out */}
                {active.status !== "RESOLVED" && active.status !== "CLOSED" && (
                  <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Shield size={14} className="text-accent" />
                      <p className="text-sm font-medium text-white">Dual-Proof Verification</p>
                    </div>

                    {/* Proof photo upload */}
                    <div
                      onClick={() => proofRef.current?.click()}
                      className="flex min-h-[120px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#30363d] transition hover:border-accent/50"
                    >
                      {proofPreview ? (
                        <div className="relative p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proofPreview} alt="After proof" className="max-h-40 rounded-lg" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProofFile(null);
                              setProofPreview(null);
                            }}
                            className="absolute -right-1 -top-1 rounded-full bg-emergency p-1 text-white"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <Camera size={28} className="mx-auto text-accent" />
                          <p className="mt-2 text-sm text-[#c9d1d9]">
                            Tap to capture or upload &quot;After&quot; photo
                          </p>
                        </div>
                      )}
                      <input
                        ref={proofRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        hidden
                        onChange={(e) => e.target.files?.[0] && handleProofSelect(e.target.files[0])}
                      />
                    </div>

                    {/* Technician notes */}
                    <textarea
                      rows={2}
                      value={techNotes}
                      onChange={(e) => setTechNotes(e.target.value)}
                      placeholder="Technician notes (optional)…"
                      className="mt-3 w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#8b949e] focus:border-accent"
                    />

                    {/* Resolve button */}
                    <Button
                      variant="success"
                      disabled={resolving || !proofFile}
                      onClick={() => handleResolve(active.id)}
                      className="mt-3 w-full"
                    >
                      {resolving ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      {resolving ? "Verifying…" : "Close Issue — Verify & Resolve"}
                    </Button>
                  </div>
                )}

                {/* All complaints */}
                <div>
                  <h3 className="mb-2 text-xs font-medium text-[#8b949e]">
                    All Reports ({active.complaints?.length ?? 0})
                  </h3>
                  <div className="space-y-2">
                    {active.complaints?.map((c: Complaint) => (
                      <div key={c.id} className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
                        <p className="text-sm font-medium text-white">{c.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#8b949e]">{c.description}</p>
                        <p className="mt-1.5 text-[10px] text-[#8b949e]">
                          {new Date(c.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Resolve Result Toast ── */}
      <AnimatePresence>
        {resolveResult && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 z-[60] w-[90vw] max-w-md -translate-x-1/2"
          >
            <div
              className={`rounded-xl border p-4 ${
                resolveResult.verified
                  ? "border-resolved/40 bg-[#0d1117]"
                  : "border-emergency/40 bg-[#0d1117]"
              }`}
            >
              <div className="flex items-start gap-3">
                {resolveResult.verified ? (
                  <CheckCircle2 className="shrink-0 text-resolved" size={24} />
                ) : (
                  <AlertTriangle className="shrink-0 text-emergency" size={24} />
                )}
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">
                    {resolveResult.verified ? "Dual-Proof Verified ✓" : "Verification Failed"}
                  </h4>
                  {resolveResult.similarity_score != null && (
                    <p className="mt-0.5 text-xs text-[#c9d1d9]">
                      Scene similarity: {(resolveResult.similarity_score * 100).toFixed(0)}%
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#8b949e]">{resolveResult.reasoning}</p>
                </div>
                <button
                  onClick={() => setResolveResult(null)}
                  className="rounded p-1 text-[#8b949e] hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Defer Reason Picker (§1.3 swipe-left) ── */}
      <Dialog open={!!deferTarget} onClose={() => setDeferTarget(null)}>
        {deferTarget && (
          <div>
            <h3 className="text-base font-bold text-white">Defer work order</h3>
            <p className="mt-1 text-xs text-[#8b949e]">
              {deferTarget.title} — the reason is audit-logged and the cluster returns to OPEN.
            </p>
            <div className="mt-4 space-y-2">
              {DEFER_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                    deferReason === r
                      ? "border-accent bg-accent/10 text-white"
                      : "border-[#30363d] text-[#c9d1d9] hover:border-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="defer-reason"
                    checked={deferReason === r}
                    onChange={() => setDeferReason(r)}
                    className="accent-[#58a6ff]"
                  />
                  {r}
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                  deferReason === "__other"
                    ? "border-accent bg-accent/10 text-white"
                    : "border-[#30363d] text-[#c9d1d9] hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="defer-reason"
                  checked={deferReason === "__other"}
                  onChange={() => setDeferReason("__other")}
                  className="accent-[#58a6ff]"
                />
                Other…
              </label>
              {deferReason === "__other" && (
                <textarea
                  autoFocus
                  rows={2}
                  value={deferOther}
                  onChange={(e) => setDeferOther(e.target.value)}
                  placeholder="Describe the reason…"
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#8b949e] focus:border-accent"
                />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeferTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDefer}>
                Defer &amp; log reason
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
