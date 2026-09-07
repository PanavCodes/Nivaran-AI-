"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Layers,
  LogOut,
  Map as MapIcon,
  UserCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { logout, requireAuth, type SessionUser } from "@/lib/auth";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Analytics, Cluster, ClusterDetail, Complaint } from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";

/* Lazy-load Leaflet map (SSR-incompatible) */
const NivaranMap = dynamic(() => import("@/components/map/NivaranMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[#8b949e]">
      Loading map…
    </div>
  ),
});

interface Technician {
  id: string;
  full_name: string;
  department: string | null;
}

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;
const statusLabels: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selected, setSelected] = useState<ClusterDetail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ── Auth gate ── */
  useEffect(() => {
    const u = requireAuth();
    if (u) setUser(u);
  }, []);

  /* ── Data fetchers ── */
  const fetchClusters = useCallback(async () => {
    try {
      const data = await api.get<Cluster[]>("/api/v1/clusters/active");
      setClusters(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalytics(await api.get<Analytics>("/api/v1/admin/analytics"));
    } catch {
      /* silent */
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    try {
      setTechnicians(await api.get<Technician[]>("/api/v1/clusters/technicians"));
    } catch {
      /* silent */
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      setSelected(await api.get<ClusterDetail>(`/api/v1/clusters/${id}`));
    } catch {
      toast.error("Failed to load cluster details");
    }
  }, []);

  useEffect(() => {
    fetchClusters();
    fetchAnalytics();
    fetchTechnicians();
  }, [fetchClusters, fetchAnalytics, fetchTechnicians]);

  /* ── WebSocket real-time updates (§3.5) ── */
  const onEvent = useCallback(
    (msg: WsMessage) => {
      switch (msg.event) {
        case "cluster.created":
        case "cluster.merged":
        case "cluster.escalated":
        case "cluster.resolved":
          fetchClusters();
          fetchAnalytics();
          if (selected && msg.data.cluster_id === selected.id) {
            fetchDetail(selected.id);
          }
          toast.info(`Live: ${msg.event.replace(".", " ")}`, { duration: 3000 });
          break;
        case "poll.refresh":
          fetchClusters();
          fetchAnalytics();
          break;
      }
    },
    [fetchClusters, fetchAnalytics, fetchDetail, selected],
  );

  useWebSocket("admin", onEvent, "/api/v1/clusters/active");

  /* ── Assign technician ── */
  async function handleAssign(clusterId: string, techId: string) {
    setAssigning(true);
    try {
      await api.patch(`/api/v1/clusters/${clusterId}/assign`, { technician_id: techId });
      toast.success("Technician assigned");
      fetchClusters();
      fetchDetail(clusterId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  /* ── SLA countdown ── */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const slaRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - now;
    if (ms <= 0) return { text: "BREACHED", urgent: true };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return {
      text: h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`,
      urgent: ms < 30 * 60 * 1000,
    };
  };

  /* ── Map clusters (only non-resolved for visual prominence) ── */
  const mapClusters = useMemo(
    () => clusters.filter((c) => c.status !== "CLOSED"),
    [clusters],
  );

  if (!user) return null;

  return (
    <main className="radar-canvas flex h-screen flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#21262d] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
            <MapIcon size={16} className="text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Mission Control</h1>
            <p className="text-[10px] text-[#8b949e]">Nivaran AI · Central Intelligence Command</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#8b949e]">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-resolved" />
            {user.full_name} ({user.role})
          </span>
          <Button variant="ghost" onClick={logout} className="text-xs">
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </header>

      {/* ── Main content: split view ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Map (60%) ── */}
        <div className="relative flex-[3] overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-[#8b949e]">
              Loading clusters…
            </div>
          ) : (
            <NivaranMap
              clusters={mapClusters}
              selectedId={selected?.id ?? null}
              onSelect={(c) => fetchDetail(c.id)}
            />
          )}

          {/* ── Analytics row (below map) ── */}
          <div className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-4 gap-px bg-[#21262d] border-t border-[#21262d]">
            {[
              {
                label: "Open Clusters",
                value: analytics?.open_clusters ?? "—",
                icon: Layers,
                color: "text-accent",
              },
              {
                label: "Avg. Resolution",
                value: analytics ? `${analytics.avg_resolution_hours}h` : "—",
                icon: Clock,
                color: "text-high",
              },
              {
                label: "SLA Breach Rate",
                value: analytics ? `${(analytics.sla_breach_rate * 100).toFixed(0)}%` : "—",
                icon: AlertTriangle,
                color: analytics && analytics.sla_breach_rate > 0.1 ? "text-emergency" : "text-resolved",
              },
              {
                label: "Top Category",
                value: analytics ? CATEGORY_LABELS[analytics.top_category] ?? analytics.top_category : "—",
                icon: BarChart3,
                color: "text-[#c9d1d9]",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-3 bg-[#0d1117] px-4 py-3">
                <kpi.icon size={18} className={kpi.color} />
                <div>
                  <div className="text-lg font-bold text-white">{kpi.value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[#8b949e]">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Cluster detail panel (40%) ── */}
        <aside className="flex w-[420px] shrink-0 flex-col overflow-hidden border-l border-[#21262d] bg-[#0d1117]/80">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-1 flex-col overflow-y-auto"
              >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#21262d] bg-[#0d1117] p-5">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={tierVariant[tierForScore(selected.priority_score) as keyof typeof tierVariant] ?? "default"}>
                        {tierForScore(selected.priority_score)}
                      </Badge>
                      <Badge variant="outline">{statusLabels[selected.status] ?? selected.status}</Badge>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-white">{selected.title}</h2>
                    <p className="mt-1 text-xs text-[#8b949e]">
                      {CATEGORY_LABELS[selected.category] ?? selected.category} · {selected.assigned_department}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-md p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 space-y-5 p-5">
                  {/* AI Summary */}
                  {selected.ai_summary && (
                    <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent">
                        <Activity size={12} /> AI Summary
                      </div>
                      <p className="text-sm leading-relaxed text-[#c9d1d9]">{selected.ai_summary}</p>
                    </div>
                  )}

                  {/* Priority Score Meter */}
                  <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8b949e]">Priority Score</span>
                      <span className="font-mono font-bold text-white">{selected.priority_score}/100</span>
                    </div>
                    <Progress
                      value={selected.priority_score}
                      className="mt-2"
                      barClassName={
                        selected.priority_score >= 75
                          ? "bg-emergency"
                          : selected.priority_score >= 50
                            ? "bg-high"
                            : selected.priority_score >= 25
                              ? "bg-medium"
                              : "bg-resolved"
                      }
                    />
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#8b949e]">
                      <span>Severity {selected.severity_score}/5</span>
                      <span>Impact {selected.impact_score}/5</span>
                      <span>{selected.complaint_count} report(s)</span>
                    </div>
                  </div>

                  {/* SLA Countdown */}
                  {(() => {
                    const sla = slaRemaining(selected.sla_deadline);
                    if (!sla) return null;
                    return (
                      <div
                        className={`rounded-lg border p-4 ${
                          sla.urgent
                            ? "border-emergency/40 bg-emergency/5"
                            : "border-[#21262d] bg-[#161b22]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                            <Clock size={12} /> SLA Deadline
                          </span>
                          <span
                            className={`font-mono text-sm font-bold ${
                              sla.urgent ? "flash-red" : "text-white"
                            }`}
                          >
                            {sla.text}
                          </span>
                        </div>
                        {selected.sla_deadline && (
                          <p className="mt-1 text-[10px] text-[#8b949e]">
                            Due by {new Date(selected.sla_deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Assign Technician */}
                  {selected.status !== "RESOLVED" && selected.status !== "CLOSED" && (
                    <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                        <UserCheck size={12} /> Assign Technician
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="tech-select"
                          className="flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-accent"
                        >
                          {technicians.length === 0 && <option value="">No technicians available</option>}
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name} {t.department ? `(${t.department})` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={assigning || technicians.length === 0}
                          onClick={() => {
                            const sel = document.getElementById("tech-select") as HTMLSelectElement;
                            if (sel?.value) handleAssign(selected.id, sel.value);
                          }}
                        >
                          {assigning ? "…" : "Assign"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Child Complaints */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                      <Layers size={12} /> Reports ({selected.complaints?.length ?? 0})
                    </h3>
                    <div className="space-y-2">
                      {selected.complaints?.map((c: Complaint) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{c.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-[#8b949e]">{c.description}</p>
                            </div>
                            <Badge variant="outline">{c.severity}/5</Badge>
                          </div>
                          {c.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image_url.startsWith("http") ? c.image_url : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${c.image_url}`}
                              alt="Report attachment"
                              className="mt-2 max-h-24 rounded-md object-cover"
                            />
                          )}
                          <p className="mt-2 text-[10px] text-[#8b949e]">
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {(!selected.complaints || selected.complaints.length === 0) && (
                        <p className="text-sm text-[#8b949e]">No reports attached yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center p-8 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#161b22]">
                  <MapIcon size={24} className="text-[#8b949e]" />
                </div>
                <p className="mt-4 text-sm text-[#8b949e]">
                  Select a cluster pin on the map to view details, AI summary, and manage assignment.
                </p>
                <p className="mt-2 text-xs text-[#8b949e]/60">
                  {clusters.length} total cluster(s) · {clusters.filter((c) => c.status === "OPEN").length} open
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </main>
  );
}
