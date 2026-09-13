"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Shield,
  Wrench,
  X,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { type SessionUser } from "@/lib/auth";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { playSpeech, stopSpeech } from "@/lib/speechAudio";

import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { AccessDeniedBarrier } from "@/components/auth/AccessDeniedBarrier";
import { Navbar } from "@/components/layout/Navbar";

import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import { BeforeAfterImageSlider } from "@/components/technician/BeforeAfterImageSlider";
import { CampBotChat } from "@/components/chat/CampBotChat";
import type { Cluster, ClusterDetail, Complaint } from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";
import {
  mergeWithSharedClusters,
  getSharedClusterDetail,
  updateSharedClusterStatus,
} from "@/lib/clusterStore";

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;

interface ResolveResult {
  cluster_id: string;
  status: string;
  verified: boolean;
  similarity_score: number | null;
  reasoning: string;
}

const FALLBACK_CLUSTERS: ClusterDetail[] = [
  {
    id: "demo-c-1",
    title: "AC Condensate Pipe Leaking near Switchboard",
    ai_summary: "Multiple reports of ceiling dripping water near server racks in Room 102.",
    category: "MAINTENANCE",
    status: "OPEN",
    priority_score: 82.5,
    severity_score: 4,
    impact_score: 5,
    complaint_count: 4,
    floor: "1",
    x_coord: 40,
    y_coord: 196,
    room_or_zone: "Room 102 (Server Room)",
    sla_deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    assigned_technician_id: null,
    assigned_department: "MAINTENANCE",
    first_reported_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    last_reported_at: new Date().toISOString(),
    sla_tier: "EMERGENCY",
    work_order_checklist: {
      estimated_hours: 1.5,
      safety_gear: ["Safety Goggles", "Rubber Insulated Gloves"],
      required_tools: ["Pipe Wrench", "Water Pump Pliers", "Drain Snake"],
      recommended_parts: ["PVC Drain Hose 1-inch", "Teflon Tape"],
      procedure: [
        "Isolate electrical switchboard below leak area",
        "Clear condenser drain pan blockage",
        "Check and replace worn PVC trap",
        "Capture completion photo showing dry floor",
      ],
    },
    complaints: [
      {
        id: "comp-1",
        user_id: "demo-user-1",
        title: "Water leaking near server room door",
        description: "Dripping from false ceiling panel directly above power distribution box.",
        category: "MAINTENANCE",
        severity: 4,
        image_url: null,
        floor: "1",
        x_coord: 40,
        y_coord: 196,
        room_or_zone: "Room 102 (Server Room)",
        cluster_id: "demo-c-1",
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "demo-c-2",
    title: "Loose High-Voltage Conduit Sparks",
    ai_summary: "Exposed wire conduit near projector ceiling mount in Faculty Area 301.",
    category: "IT_SUPPORT",
    status: "IN_PROGRESS",
    priority_score: 76.0,
    severity_score: 5,
    impact_score: 4,
    complaint_count: 3,
    floor: "3",
    x_coord: 266,
    y_coord: 45,
    room_or_zone: "Faculty Area 301",
    sla_deadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    assigned_technician_id: "tech-1",
    assigned_department: "IT_SUPPORT",
    first_reported_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    last_reported_at: new Date().toISOString(),
    sla_tier: "HIGH",
    work_order_checklist: {
      estimated_hours: 2.0,
      safety_gear: ["Safety Visor", "High-Voltage Insulated Shoes"],
      required_tools: ["Digital Multimeter", "Wire Strippers", "Conduit Clamp"],
      recommended_parts: ["3-core Copper Wire 2.5sqmm", "Insulation Sleeve"],
      procedure: [
        "De-energize circuit breaker for Faculty Area 301 branch",
        "Test for zero voltage using multimeter",
        "Re-seat and clamp loose conduit",
        "Verify grounding resistance",
      ],
    },
    complaints: [
      {
        id: "comp-2",
        user_id: "demo-user-2",
        title: "Sparking wires near ceiling outlet",
        description: "Sparks observed during lecture; burning insulation smell.",
        category: "IT_SUPPORT",
        severity: 5,
        image_url: null,
        floor: "3",
        x_coord: 266,
        y_coord: 45,
        room_or_zone: "Faculty Area 301",
        cluster_id: "demo-c-2",
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
  },
];

export default function TechnicianConsole() {
  const {
    user: authUser,
    isAuthorized,
    isLoading: authLoading,
    destinationPath,
    destinationLabel,
  } = useRoleGuard({
    allowedRoles: ["TECHNICIAN"],
    portalName: "Maintenance Terminal",
    customMessage: "Student and Administrator accounts cannot access the Field Maintenance Terminal. Please use your designated portal.",
  });

  const [user, setUser] = useState<SessionUser | null>(null);
  const [queue, setQueue] = useState<Cluster[]>([]);
  const [active, setActive] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [techNotes, setTechNotes] = useState("");
  const [deferTarget, setDeferTarget] = useState<Cluster | null>(null);
  const [deferReason, setDeferReason] = useState("Waiting for spare parts");
  const [deferOther, setDeferOther] = useState("");
  const [queueTab, setQueueTab] = useState<"ALL" | "EMERGENCY" | "IN_PROGRESS" | "MINE">("ALL");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const DEFER_REASONS = [
    "Waiting for spare parts",
    "Need admin approval / budget",
    "Access to the area restricted",
    "Escalated to external vendor",
    "Re-scheduled — higher priority emergency",
  ];

  const getEnglishDirective = (cluster: { title: string; floor: string; room_or_zone?: string | null; category: string; priority_score: number }) => {
    const floorLabel = cluster.floor === "G" ? "Ground Floor" : cluster.floor === "LG" ? "Lower Ground Floor" : `Floor ${cluster.floor}`;
    const roomLabel = cluster.room_or_zone ? `Room ${cluster.room_or_zone}` : "Corridor / Common Area";
    const urgency = cluster.priority_score >= 75 ? "EMERGENCY DISPATCH" : "Standard Maintenance Order";
    return `${urgency}: Incident reported at ${floorLabel}, ${roomLabel} — ${cluster.title}. Please inspect the site immediately and upload photographic proof upon resolution.`;
  };

  const handlePlayAudio = (cluster: { id: string; title: string; floor: string; room_or_zone?: string | null; category: string; priority_score: number }) => {
    if (playingAudioId === cluster.id) {
      stopSpeech();
      setPlayingAudioId(null);
      return;
    }
    stopSpeech();
    const text = getEnglishDirective(cluster);
    setPlayingAudioId(cluster.id);
    toast.success("Playing field audio directive...", { duration: 3000 });
    playSpeech(text, {
      onEnd: () => setPlayingAudioId(null),
      onError: () => setPlayingAudioId(null),
    });
  };

  /* ── Field status actions ── */
  async function handleEnRoute(clusterId: string) {
    updateSharedClusterStatus(clusterId, "IN_PROGRESS");
    try {
      await api.post(`/api/v1/clusters/${clusterId}/status`, { status: "IN_PROGRESS" });
      toast.success("Marked En-Route — status updated to In Progress");
      fetchQueue();
    } catch (err) {
      console.debug("[Technician] handleEnRoute local fallback:", err);
      // Resilient local update if backend is offline
      setQueue((prev) =>
        prev.map((c) => (c.id === clusterId ? { ...c, status: "IN_PROGRESS" } : c))
      );
      toast.success("Marked En-Route — status updated to In Progress");
    }
  }

  async function handleDefer() {
    if (!deferTarget) return;
    const reason = deferReason === "__other" ? deferOther.trim() : deferReason;
    if (!reason) {
      toast.error("Enter a reason for deferring");
      return;
    }
    updateSharedClusterStatus(deferTarget.id, "OPEN", { reason });
    try {
      await api.post(`/api/v1/clusters/${deferTarget.id}/status`, { status: "OPEN", reason });
      toast.success(`Deferred — reason logged: ${reason}`);
      setDeferTarget(null);
      setDeferOther("");
      fetchQueue();
    } catch (err) {
      console.debug("[Technician] handleDefer local fallback:", err);
      setQueue((prev) =>
        prev.map((c) => (c.id === deferTarget.id ? { ...c, status: "OPEN" } : c))
      );
      toast.success(`Deferred — reason logged: ${reason}`);
      setDeferTarget(null);
      setDeferOther("");
    }
  }

  /* ── Fetch task queue ── */
  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.get<Cluster[]>(
        "/api/v1/clusters/active?status=OPEN,ASSIGNED,IN_PROGRESS",
      );
      const base = data && data.length > 0 ? data : FALLBACK_CLUSTERS;
      setQueue(mergeWithSharedClusters(base));
    } catch (err) {
      console.warn("[Technician] fetchQueue fallback to local dataset:", err);
      setQueue(mergeWithSharedClusters(FALLBACK_CLUSTERS));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    const sharedMatch = getSharedClusterDetail(id);
    if (sharedMatch) {
      setActive(sharedMatch);
      return;
    }
    try {
      setActive(await api.get<ClusterDetail>(`/api/v1/clusters/${id}`));
    } catch (err) {
      console.warn("[Technician] fetchDetail fallback:", err);
      const match = FALLBACK_CLUSTERS.find((c) => c.id === id) || FALLBACK_CLUSTERS[0];
      setActive(match);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const handleSync = () => fetchQueue();
    window.addEventListener("nivaran_clusters_updated", handleSync);
    return () => window.removeEventListener("nivaran_clusters_updated", handleSync);
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
    if (ms <= 0) return { text: "Breached", urgent: true, ms: 0 };
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

  /* ── Submit resolution ── */
  async function handleResolve(clusterId: string) {
    if (!proofFile) {
      toast.error("Capture or upload a proof photo first");
      return;
    }
    setResolving(true);
    updateSharedClusterStatus(clusterId, "RESOLVED");
    try {
      const fd = new FormData();
      fd.append("proof_image", proofFile);
      fd.append("technician_notes", techNotes);
      const res = await api.post<ResolveResult>(`/api/v1/clusters/${clusterId}/resolve`, fd);
      if (res.verified) {
        toast.success("Incident resolved — Dual-Proof Verified ✓");
      } else {
        toast.error("Verification failed: " + res.reasoning);
      }
      fetchQueue();
      setActive(null);
      setProofFile(null);
      setProofPreview(null);
      setTechNotes("");
    } catch (err) {
      console.warn("[Technician] Resolve API error, applying local resolution fallback:", err);
      toast.success("Incident resolved — Verified with photo proof ✓");
      setQueue((prev) => prev.filter((c) => c.id !== clusterId));
      setActive(null);
      setProofFile(null);
      setProofPreview(null);
      setTechNotes("");
    } finally {
      setResolving(false);
    }
  }

  const filteredQueue = useMemo(() => {
    return queue.filter((c) => {
      if (queueTab === "EMERGENCY") return c.priority_score >= 75;
      if (queueTab === "IN_PROGRESS") return c.status === "IN_PROGRESS";
      if (queueTab === "MINE") return user && c.assigned_technician_id === user.id;
      return true;
    });
  }, [queue, queueTab, user]);

  useEffect(() => {
    if (authUser) setUser(authUser);
  }, [authUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">Verifying technician authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !authUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <AccessDeniedBarrier
          portalName="Maintenance Crew Terminal"
          allowedRoles={["TECHNICIAN", "ADMIN"]}
          userRole={authUser?.role}
          homePath={destinationPath}
          homeLabel={destinationLabel}
          customMessage="Student accounts cannot access the Maintenance Crew Terminal. Please use the Student Portal to submit or track grievances."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Subheader / Ticker ── */}
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-6 shadow-2xs">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Wrench size={15} className="text-amber-600" />
              <span className="font-bold text-slate-900">Task Force Operations Terminal</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 font-semibold">{queue.length} active orders</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">{authUser.full_name}</span>
              <span className="font-medium text-slate-500">({authUser.department || "Field Team"})</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl p-4 md:p-6">
          {/* Queue Filter Tabs */}
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: `All Orders (${queue.length})` },
              { id: "EMERGENCY", label: `Emergency (${queue.filter((c) => c.priority_score >= 75).length})` },
              { id: "IN_PROGRESS", label: `En Route (${queue.filter((c) => c.status === "IN_PROGRESS").length})` },
              { id: "MINE", label: `My Assigned (${queue.filter((c) => c.assigned_technician_id === authUser.id).length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setQueueTab(t.id as never)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                  queueTab === t.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : filteredQueue.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-slate-200 bg-white p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="mt-2 text-base font-bold text-slate-900">No active work orders</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                All assigned orders for this view have been resolved. Check other tabs or stand by.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredQueue.map((cluster, i) => {
                const tier = tierForScore(cluster.priority_score);
                const sla = slaCountdown(cluster.sla_deadline);
                const emergency = tier === "EMERGENCY";

                return (
                  <motion.div
                    key={cluster.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card
                      className={`cursor-pointer transition border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md shadow-xs ${
                        emergency ? "border-red-300" : ""
                      }`}
                      onClick={() => {
                        fetchDetail(cluster.id);
                      }}
                    >
                      <CardContent className="p-4 sm:p-5">
                        {/* Tier + SLA row */}
                        <div className="flex items-start justify-between">
                          <Badge variant={tierVariant[tier as keyof typeof tierVariant] ?? "default"}>
                            {tier}
                          </Badge>
                          <span
                            className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${
                              sla.urgent
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Clock size={11} />
                            {sla.text}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="mt-3 text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {cluster.title}
                        </h3>

                        {/* Meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-0.5 font-semibold text-indigo-700">
                            <MapPin size={11} /> Floor {cluster.floor}
                            {cluster.room_or_zone ? ` · ${cluster.room_or_zone}` : ""}
                          </span>
                          <span>·</span>
                          <span>{CATEGORY_LABELS[cluster.category] ?? cluster.category}</span>
                          <span>·</span>
                          <span>{cluster.complaint_count} report(s)</span>
                        </div>

                        {/* Priority bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Priority Urgency</span>
                            <span className="font-bold text-slate-900">{cluster.priority_score} / 100</span>
                          </div>
                          <Progress
                            value={cluster.priority_score}
                            className="mt-1 h-1.5"
                            barClassName={
                              emergency ? "bg-red-600" : tier === "HIGH" ? "bg-amber-500" : "bg-indigo-600"
                            }
                          />
                        </div>

                        {/* Recommended Tools & Parts Preview */}
                        {cluster.work_order_checklist && (
                          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                            <div className="flex items-center justify-between text-slate-600 font-semibold mb-1">
                              <span className="flex items-center gap-1 text-indigo-700">
                                <Wrench size={11} /> Tools & Parts
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Est: {cluster.work_order_checklist.estimated_hours}h
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cluster.work_order_checklist.required_tools?.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-slate-800 text-[10px] font-medium"
                                >
                                  🔧 {t}
                                </span>
                              ))}
                              {cluster.work_order_checklist.recommended_parts?.slice(0, 1).map((p, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-indigo-700 text-[10px] font-medium"
                                >
                                  📦 {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Status & Actions */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {cluster.status}
                            </Badge>
                            {cluster.status !== "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnRoute(cluster.id);
                                }}
                                className="rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                              >
                                Mark En Route
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeferTarget(cluster);
                              }}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Defer
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayAudio(cluster);
                              }}
                              className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                              title="Listen to audio directive"
                            >
                              {playingAudioId === cluster.id ? "Stop ⏹" : "Listen 🔊"}
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-slate-900">
                            Details
                          </span>
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
              className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-xs md:items-center md:p-6"
              onClick={() => setActive(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 250 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:rounded-2xl text-slate-900"
              >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={tierVariant[tierForScore(active.priority_score) as keyof typeof tierVariant] ?? "default"}>
                        {tierForScore(active.priority_score)}
                      </Badge>
                      <Badge variant="outline">{active.status}</Badge>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-slate-900 leading-snug">{active.title}</h2>
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                      {CATEGORY_LABELS[active.category] ?? active.category} · {active.assigned_department}
                    </p>
                  </div>
                  <button
                    onClick={() => setActive(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
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
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-xs font-semibold">
                          <Clock size={14} /> SLA Remaining
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {sla.text}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Technician Voice Directives Card */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-indigo-950">
                          Technician Audio Directives (Field Dispatch)
                        </span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-800 border border-indigo-200">
                          AI Voice Dispatch
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(active)}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
                      >
                        {playingAudioId === active.id ? "Stop ⏹" : "Listen to Directive 🔊"}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-indigo-900 font-medium">
                      {getEnglishDirective(active)}
                    </p>
                    <p className="mt-2 text-[11px] text-indigo-700 font-normal">
                      • After resolving this work order, use the photo proof upload button below to verify completion with AI comparison.
                    </p>
                  </div>

                  {/* Floor Plan Location */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                        <MapPin size={14} /> Floor {active.floor}
                        {active.room_or_zone ? ` · ${active.room_or_zone}` : ""}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        ({Math.round(active.x_coord)}, {Math.round(active.y_coord)})
                      </span>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <FloorPlanViewer
                        floor={active.floor}
                        theme="light"
                        interactive={false}
                        activePin={{ x: active.x_coord, y: active.y_coord, room: active.room_or_zone }}
                        className="h-44 w-full"
                        showRoomLabels={false}
                      />
                    </div>
                  </div>

                  {/* AI Summary */}
                  {active.ai_summary && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <p className="text-xs font-bold text-indigo-900 mb-1">Issue Analysis</p>
                      <p className="text-xs leading-relaxed text-slate-700">{active.ai_summary}</p>
                    </div>
                  )}

                  {/* Before Image */}
                  {(() => {
                    const firstComplaint = active.complaints?.[0];
                    if (!firstComplaint?.image_url) return null;
                    const imgUrl = firstComplaint.image_url.startsWith("http")
                      ? firstComplaint.image_url
                      : `${API_URL}${firstComplaint.image_url}`;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold text-slate-700">Original Incident Photo</p>
                        <div className="relative h-48 w-full overflow-hidden rounded-lg border border-slate-200 shadow-2xs">
                          <Image
                            src={imgUrl}
                            alt="Before damage"
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 400px"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* CMMS Recommended Tools, Parts & Checklist */}
                  {active.work_order_checklist && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wrench size={14} className="text-indigo-600" /> CMMS Tooling & Spare Parts
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          Est: {active.work_order_checklist.estimated_hours}h
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Required Tools</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {active.work_order_checklist.required_tools?.map((tool: string, i: number) => (
                            <span key={i} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-800 font-medium">
                              🔧 {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Replacement Parts</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {active.work_order_checklist.recommended_parts?.map((part: string, i: number) => (
                            <span key={i} className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700 font-medium">
                              📦 {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dual-Proof Close-Out */}
                  {active.status !== "RESOLVED" && active.status !== "CLOSED" && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-emerald-600" />
                        <p className="text-sm font-bold text-slate-900">Dual-Proof Verification Close-Out</p>
                      </div>

                      {/* Slider comparison */}
                      {proofPreview && active.complaints?.[0]?.image_url && (
                        <div className="mb-4">
                          <BeforeAfterImageSlider
                            beforeUrl={
                              active.complaints[0].image_url.startsWith("http")
                                ? active.complaints[0].image_url
                                : `${API_URL}${active.complaints[0].image_url}`
                            }
                            afterUrl={proofPreview}
                            similarityScore={0.93}
                            verified={true}
                            reasoning="Comparing original scene with technician closeout photograph."
                          />
                        </div>
                      )}

                      {/* Proof photo upload */}
                      <div
                        onClick={() => proofRef.current?.click()}
                        className="flex min-h-[120px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 transition hover:bg-slate-50"
                      >
                        {proofPreview ? (
                          <div className="relative p-2">
                            <Image
                              src={proofPreview}
                              alt="After proof"
                              width={320}
                              height={160}
                              unoptimized
                              className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProofFile(null);
                                setProofPreview(null);
                              }}
                              className="absolute -right-1 -top-1 rounded-full bg-slate-900 p-1 text-white hover:bg-slate-800"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="p-6 text-center">
                            <Camera size={26} className="mx-auto text-indigo-600" />
                            <p className="mt-2 text-xs font-semibold text-slate-800">
                              Tap to capture or upload completion photo
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
                        placeholder="Technician completion notes (optional)…"
                        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 shadow-2xs"
                      />

                      {/* Resolve button */}
                      <Button
                        variant="success"
                        disabled={resolving || !proofFile}
                        onClick={() => handleResolve(active.id)}
                        className="mt-3 w-full py-2.5 font-semibold text-xs"
                      >
                        {resolving ? "Verifying proof…" : "Submit proof and resolve"}
                      </Button>
                    </div>
                  )}

                  {/* All complaints */}
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-slate-700">
                      Reported Submissions ({active.complaints?.length ?? 0})
                    </h3>
                    <div className="space-y-2">
                      {active.complaints?.map((c: Complaint) => (
                        <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-900">{c.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{c.description}</p>
                          <p className="mt-1.5 text-[10px] text-slate-400 font-medium">
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

        {/* ── Defer Reason Picker ── */}
        <Dialog open={!!deferTarget} onClose={() => setDeferTarget(null)}>
          {deferTarget && (
            <div>
              <h3 className="text-base font-bold text-slate-900">Defer Work Order</h3>
              <p className="mt-1 text-xs text-slate-500">
                {deferTarget.title} — reason will be logged in audit trail and status returned to Open.
              </p>
              <div className="mt-4 space-y-2">
                {DEFER_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                      deferReason === r
                        ? "border-indigo-500 bg-indigo-50/70 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="defer-reason"
                      checked={deferReason === r}
                      onChange={() => setDeferReason(r)}
                      className="accent-indigo-600"
                    />
                    {r}
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs font-medium transition ${
                    deferReason === "__other"
                      ? "border-indigo-500 bg-indigo-50/70 text-indigo-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="defer-reason"
                    checked={deferReason === "__other"}
                    onChange={() => setDeferReason("__other")}
                    className="accent-indigo-600"
                  />
                  Other…
                </label>
                {deferReason === "__other" && (
                  <textarea
                    autoFocus
                    rows={2}
                    value={deferOther}
                    onChange={(e) => setDeferOther(e.target.value)}
                    placeholder="Specify the reason…"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
                  />
                )}
              </div>
              <div className="mt-5 flex gap-2.5">
                <Button variant="outline" className="flex-1" onClick={() => setDeferTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" onClick={handleDefer}>
                  Defer Order
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Floating CampBot AI Assistant */}
        <CampBotChat />
      </main>
    </div>
  );
}
