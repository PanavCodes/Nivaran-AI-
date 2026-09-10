"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building,
  Clock,
  Eye,
  Layers,
  MapPin,
  Sun,
  Moon,
  UserCheck,
  X,
  Flame,
  Search,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { sound } from "@/lib/sound";

import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityGauge } from "@/components/ui/priority-gauge";
import { Navbar } from "@/components/layout/Navbar";
import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import { ElevatorFloorNavigator } from "@/components/floorplan/ElevatorFloorNavigator";
import { FacilityHealthGauge } from "@/components/floorplan/FacilityHealthGauge";
import { IncidentMemoModal } from "@/components/admin/IncidentMemoModal";
import { CampBotChat } from "@/components/chat/CampBotChat";
import { getFloorMeta } from "@/lib/campus_floors";

import type {
  Analytics,
  Cluster,
  ClusterDetail,
  Complaint,
  FloorSummaryItem,
} from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";

interface Technician {
  id: string;
  full_name: string;
  department: string | null;
}

const tierVariant = {
  EMERGENCY: "emergency",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "resolved",
} as const;

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
  const [floorSummaries, setFloorSummaries] = useState<FloorSummaryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [activeFloor, setActiveFloor] = useState<string>("1");
  const [planTheme, setPlanTheme] = useState<"dark" | "light">("dark");
  const [showRoomLabels, setShowRoomLabels] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [showMemo, setShowMemo] = useState(false);


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

  const fetchFloorSummaries = useCallback(async () => {
    try {
      const data = await api.get<FloorSummaryItem[]>("/api/v1/clusters/floors/summary");
      setFloorSummaries(data);
    } catch {
      /* silent */
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
      const detail = await api.get<ClusterDetail>(`/api/v1/clusters/${id}`);
      setSelected(detail);
      // Auto-switch to the cluster's floor if not already on it
      if (detail.floor) {
        setActiveFloor(detail.floor.toUpperCase());
      }
    } catch {
      toast.error("Failed to load cluster details");
    }
  }, []);

  useEffect(() => {
    fetchClusters();
    fetchFloorSummaries();
    fetchAnalytics();
    fetchTechnicians();
  }, [fetchClusters, fetchFloorSummaries, fetchAnalytics, fetchTechnicians]);

  /* ── WebSocket real-time updates (§3.5) ── */
  const onEvent = useCallback(
    (msg: WsMessage) => {
      switch (msg.event) {
        case "cluster.created":
        case "cluster.merged":
        case "cluster.escalated":
        case "cluster.reinforced":
          if (msg.data && typeof msg.data.priority_score === "number" && msg.data.priority_score >= 75) {
            sound.playUrgentAlert();
          } else {
            sound.playRadarPing();
          }
          fetchClusters();
          fetchFloorSummaries();
          fetchAnalytics();
          if (selected && msg.data && msg.data.cluster_id === selected.id) {
            fetchDetail(selected.id);
          }
          toast.info(`Live: ${msg.event.replace(".", " ")}`, { duration: 3000 });
          break;
        case "cluster.resolved":
          sound.playSuccess();
          fetchClusters();
          fetchFloorSummaries();
          fetchAnalytics();
          if (selected && msg.data && msg.data.cluster_id === selected.id) {
            fetchDetail(selected.id);
          }
          toast.success("Live: Incident cluster resolved & verified", { duration: 3000 });
          break;
        case "poll.refresh":
          fetchClusters();
          fetchFloorSummaries();
          fetchAnalytics();
          break;
      }
    },
    [fetchClusters, fetchFloorSummaries, fetchAnalytics, fetchDetail, selected]
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

  /* ── Most impacted floor ── */
  const highestRiskFloor = useMemo(() => {
    if (floorSummaries.length === 0) return null;
    const sorted = [...floorSummaries].sort((a, b) => {
      if (b.emergency_count !== a.emergency_count) return b.emergency_count - a.emergency_count;
      return b.open_count - a.open_count;
    });
    return sorted[0]?.open_count > 0 ? sorted[0].floor : null;
  }, [floorSummaries]);

  const activeFloorMeta = getFloorMeta(activeFloor);
  const activeFloorClusters = useMemo(() => {
    let list = clusters.filter(
      (c) => c.floor.toUpperCase() === activeFloor.toUpperCase() && c.status !== "CLOSED"
    );
    if (filterCategory !== "ALL") {
      list = list.filter((c) => c.category === filterCategory);
    }
    if (filterTier !== "ALL") {
      list = list.filter((c) => tierForScore(c.priority_score) === filterTier);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.room_or_zone && c.room_or_zone.toLowerCase().includes(q))
      );
    }
    return list;
  }, [clusters, activeFloor, filterCategory, filterTier, searchQuery]);


  const emergencyCountOnFloor = activeFloorClusters.filter((c) => c.priority_score >= 75).length;
  const fhiScore = Math.max(0, 100 - activeFloorClusters.length * 5 - emergencyCountOnFloor * 15);

  if (!user) return null;

  const activeEmergencies = clusters.filter(
    (c) => c.priority_score >= 75 && c.status !== "RESOLVED" && c.status !== "CLOSED"
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0d1117]">
      <Navbar />

      {/* Top Emergency Hotspot Alert Banner if any critical incidents exist */}
      {activeEmergencies.length > 0 && (
        <div className="relative z-20 flex items-center justify-between border-b border-red-500/40 bg-red-500/15 px-4 py-2 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-bold uppercase tracking-wider text-red-400">Emergency Hotspot Alert:</span>
            <span>
              {activeEmergencies.length} critical incident(s) require immediate dispatch
            </span>
          </div>
          <button
            onClick={() => {
              const emerg = activeEmergencies[0];
              if (emerg) {
                sound.playRadarPing();
                setActiveFloor(emerg.floor.toUpperCase());
                fetchDetail(emerg.id);
              }
            }}
            className="rounded bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition"
          >
            Locate Hotspot →
          </button>
        </div>
      )}

      {/* ── Subheader Bar with Analytics Toggle & Memo ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-[#21262d] bg-[#161b22]/70 px-5 py-2">
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          <Building size={14} className="text-[#58a6ff]" />
          <span className="font-semibold text-white">Indoor Mission Control</span>
          <span>·</span>
          <span>10-Storey Facility Matrix</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showCharts ? "primary" : "outline"}
            onClick={() => { sound.playClick(); setShowCharts((v) => !v); }}
            className="text-xs h-7 py-0"
          >
            <BarChart3 size={13} /> Analytics Drawer
          </Button>
          <Button
            variant="outline"
            onClick={() => { sound.playClick(); setShowMemo(true); }}
            className="text-xs h-7 py-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
          >
            <FileText size={13} /> Incident Memo
          </Button>
        </div>
      </div>


      {/* ── Main Content: Elevator Shaft + Floor Plan Canvas + Detail Panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── 1. Elevator Vertical Floor Selector (Left Rail) ── */}
        <div className="w-[110px] shrink-0 border-r border-[#21262d] bg-[#0d1117]/90 p-2">
          <ElevatorFloorNavigator
            selectedFloor={activeFloor}
            onSelectFloor={(f) => setActiveFloor(f)}
            floorSummaries={floorSummaries}
          />
        </div>

        {/* ── 2. Center: Tactical Floor Plan Blueprint Workspace ── */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#090d13]">
          {/* Floor Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21262d] bg-[#0d1117]/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Floor {activeFloor}</span>
              <span className="text-[#8b949e]">· {activeFloorMeta.label}</span>
              <Badge variant="outline" className="text-[10px]">
                {activeFloorClusters.length}{" "}
                {activeFloorClusters.length === 1 ? "issue" : "issues"}
              </Badge>
            </div>

            {/* AI Natural Language Filter Bar (AI Grievance / anshikaparikh) */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#161b22] px-2.5 py-1 text-xs">
              <Search size={12} className="text-[#8b949e]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="AI Filter: 'leak', 'lab 1', 'lights'…"
                className="bg-transparent text-white text-[11px] outline-none w-32 sm:w-44 placeholder:text-[#8b949e]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#8b949e] hover:text-white">
                  <X size={11} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Heatmap density toggle (Smart Campus Intelligence Hub) */}
              <button
                onClick={() => setHeatmapMode((v) => !v)}
                className={`flex items-center gap-1 rounded px-2 py-1 transition ${
                  heatmapMode
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Flame size={12} />
                <span className="text-[10px]">Heatmap</span>
              </button>

              <button
                onClick={() => setShowRoomLabels((v) => !v)}
                className={`flex items-center gap-1 rounded px-2 py-1 transition ${
                  showRoomLabels ? "bg-accent/20 text-accent" : "text-[#8b949e] hover:text-white"
                }`}
              >
                <Eye size={12} />
                <span className="text-[10px]">Labels</span>
              </button>

              <button
                onClick={() => setPlanTheme(planTheme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1 rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-[#c9d1d9] hover:border-accent/40"
              >
                {planTheme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
                <span>{planTheme === "dark" ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>

          {/* Category & Urgency Quick Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[#21262d] bg-[#0d1117]/60 px-4 py-1.5 text-xs">
            <span className="text-[10px] uppercase font-semibold text-[#8b949e] shrink-0">Category:</span>
            {["ALL", "IT_SUPPORT", "MAINTENANCE", "HOUSEKEEPING", "FACILITIES"].map((cat) => (
              <button
                key={cat}
                onClick={() => { sound.playClick(); setFilterCategory(cat); }}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition shrink-0 ${
                  filterCategory === cat
                    ? "bg-[#58a6ff] text-[#0d1117] font-bold shadow-sm"
                    : "bg-[#161b22] text-[#8b949e] hover:text-white border border-[#30363d]"
                }`}
              >
                {cat === "ALL" ? "All" : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}

            <span className="text-[#30363d] mx-1">|</span>

            <span className="text-[10px] uppercase font-semibold text-[#8b949e] shrink-0">Urgency:</span>
            {["ALL", "EMERGENCY", "HIGH", "MEDIUM", "LOW"].map((tier) => (
              <button
                key={tier}
                onClick={() => { sound.playClick(); setFilterTier(tier); }}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition shrink-0 ${
                  filterTier === tier
                    ? tier === "EMERGENCY" ? "bg-red-500 text-white font-bold shadow-sm" :
                      tier === "HIGH" ? "bg-amber-500 text-black font-bold shadow-sm" :
                      tier === "MEDIUM" ? "bg-orange-500 text-white font-bold shadow-sm" :
                      "bg-emerald-500 text-black font-bold shadow-sm"
                    : "bg-[#161b22] text-[#8b949e] hover:text-white border border-[#30363d]"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Facility Health Gauge (Civic-Fix & Smart Campus Intelligence Hub) */}
          <div className="px-4 pt-2">

            <FacilityHealthGauge
              score={fhiScore}
              openIncidents={activeFloorClusters.length}
              emergencyCount={emergencyCountOnFloor}
              floorLabel={`Floor ${activeFloor}`}
            />
          </div>

          {/* Blueprint SVG Canvas Area */}
          <div className="relative flex-1 overflow-hidden p-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#8b949e]">
                Loading floor plans and clusters…
              </div>
            ) : (
              <FloorPlanViewer
                floor={activeFloor}
                theme={planTheme}
                clusters={clusters}
                selectedClusterId={selected?.id ?? null}
                onClusterSelect={(c) => fetchDetail(c.id)}
                showRoomLabels={showRoomLabels}
                heatmapMode={heatmapMode}
                className="h-full w-full"
              />
            )}
          </div>

          {/* KPI Stat Bar (Below Canvas) */}
          <div className="relative z-10 grid grid-cols-2 border-t border-[#21262d] bg-[#0d1117] sm:grid-cols-4">
            {[
              {
                label: "Building Open Issues",
                value: analytics?.open_clusters ?? clusters.filter((c) => c.status !== "CLOSED").length,
                icon: Layers,
                color: "text-accent",
              },
              {
                label: "Highest Risk Floor",
                value: highestRiskFloor ? `Floor ${highestRiskFloor}` : "Stable",
                icon: AlertTriangle,
                color: highestRiskFloor ? "text-emergency" : "text-resolved",
              },
              {
                label: "SLA Breach Rate",
                value: analytics ? `${(analytics.sla_breach_rate * 100).toFixed(0)}%` : "0%",
                icon: Clock,
                color: analytics && analytics.sla_breach_rate > 0.1 ? "text-emergency" : "text-resolved",
              },
              {
                label: "Top Category",
                value: analytics ? CATEGORY_LABELS[analytics.top_category] ?? analytics.top_category : "—",
                icon: BarChart3,
                color: "text-[#c9d1d9]",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-3 border-r border-[#21262d] px-4 py-2.5 last:border-r-0">
                <kpi.icon size={16} className={kpi.color} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{kpi.value}</div>
                  <div className="truncate text-[9px] uppercase tracking-wide text-[#8b949e]">
                    {kpi.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recharts Analytics Overlay */}
          <AnimatePresence>
            {showCharts && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute bottom-[50px] left-0 right-0 z-30 border-t border-[#21262d] bg-[#0d1117]/95 p-4 backdrop-blur-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Facility Intelligence Metrics</span>
                  <button onClick={() => setShowCharts(false)} className="text-[#8b949e] hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <AnalyticsCharts refreshToken={analytics?.open_clusters ?? 0} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 3. Right: Cluster Detail & Action Flyout ── */}
        <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden border-l border-[#21262d] bg-[#0d1117]/90">
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
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#21262d] bg-[#0d1117] p-4">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          tierVariant[
                            tierForScore(selected.priority_score) as keyof typeof tierVariant
                          ] ?? "default"
                        }
                      >
                        {tierForScore(selected.priority_score)}
                      </Badge>
                      <Badge variant="outline">{statusLabels[selected.status] ?? selected.status}</Badge>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-white">{selected.title}</h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#8b949e]">
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        <MapPin size={11} /> Floor {selected.floor}
                        {selected.room_or_zone ? ` · ${selected.room_or_zone}` : ""}
                      </span>
                      <span>·</span>
                      <span>{CATEGORY_LABELS[selected.category] ?? selected.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-md p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 space-y-4 p-4">
                  {/* AI Summary */}
                  {selected.ai_summary && (
                    <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-3.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent">
                        <Activity size={12} /> Gemini Rollup Summary
                      </div>
                      <p className="text-xs leading-relaxed text-[#c9d1d9]">{selected.ai_summary}</p>
                    </div>
                  )}

                  {/* Priority Radial Gauge */}
                  <div className="flex items-center justify-center rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                    <PriorityGauge score={selected.priority_score} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                    <span>Severity {selected.severity_score}/5</span>
                    <span>Impact {selected.impact_score}/5</span>
                    <span>{selected.complaint_count} report(s) merged</span>
                  </div>

                  {/* SLA Countdown */}
                  {(() => {
                    const sla = slaRemaining(selected.sla_deadline);
                    if (!sla) return null;
                    return (
                      <div
                        className={`rounded-lg border p-3 ${
                          sla.urgent
                            ? "border-emergency/40 bg-emergency/5"
                            : "border-[#21262d] bg-[#161b22]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                            <Clock size={12} /> SLA Target
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
                            Deadline: {new Date(selected.sla_deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Assign Technician */}
                  {selected.status !== "RESOLVED" && selected.status !== "CLOSED" && (
                    <div className="rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                        <UserCheck size={12} /> Assign Field Technician
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="tech-select"
                          className="flex-1 rounded-lg border border-[#30363d] bg-[#0d1117] px-2.5 py-1.5 text-xs text-white outline-none focus:border-accent"
                        >
                          {technicians.length === 0 && (
                            <option value="">No technicians available</option>
                          )}
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name} {t.department ? `(${t.department})` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          className="px-3 py-1 text-xs"
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

                  {/* Official University Incident Memo Button (Civic-Fix) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMemo(true)}
                    className="w-full border-accent/40 text-accent hover:bg-accent/10 flex items-center justify-center gap-1.5 text-xs h-8"
                  >
                    <FileText size={13} /> Generate University Incident Memo
                  </Button>

                  {/* Child Reports */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
                      <Layers size={12} /> Child Reports ({selected.complaints?.length ?? 0})
                    </h3>
                    <div className="space-y-2">
                      {selected.complaints?.map((c: Complaint) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-[#21262d] bg-[#0d1117] p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-white">{c.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-[#8b949e]">
                                {c.description}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-accent">
                                <MapPin size={9} /> Floor {c.floor}
                                {c.room_or_zone ? ` · ${c.room_or_zone}` : ""}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {c.severity}/5
                            </Badge>
                          </div>
                          {c.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                c.image_url.startsWith("http")
                                  ? c.image_url
                                  : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${c.image_url}`
                              }
                              alt="Report attachment"
                              className="mt-2 max-h-24 rounded-md object-cover"
                            />
                          )}
                          <p className="mt-1.5 text-[9px] text-[#8b949e]">
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#161b22]">
                  <Building size={22} className="text-[#8b949e]" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">Select an Issue Pin</h3>
                <p className="mt-1 text-xs text-[#8b949e]">
                  Click any pulsating cluster pin on Floor {activeFloor} or switch floors via the
                  elevator on the left.
                </p>
                <p className="mt-3 text-[11px] text-[#8b949e]/60">
                  {clusters.length} total cluster(s) across 10 floors
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* Incident Memo Modal (Civic-Fix LetterGenerator) */}
      <IncidentMemoModal
        cluster={selected}
        open={showMemo}
        onClose={() => setShowMemo(false)}
      />

      {/* Floating CampBot AI Assistant (CampFeed) */}
      <CampBotChat />
    </div>
  );
}

