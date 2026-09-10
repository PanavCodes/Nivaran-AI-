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
  const [planTheme, setPlanTheme] = useState<"dark" | "light">("light");
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

  /* ── WebSocket real-time updates ── */
  const onEvent = useCallback(
    (msg: WsMessage) => {
      switch (msg.event) {
        case "cluster.created":
        case "cluster.merged":
        case "cluster.escalated":
        case "cluster.reinforced":
          fetchClusters();
          fetchFloorSummaries();
          fetchAnalytics();
          if (selected && msg.data && msg.data.cluster_id === selected.id) {
            fetchDetail(selected.id);
          }
          toast.info(`Update: ${msg.event.replace(".", " ")}`);
          break;
        case "cluster.resolved":
          fetchClusters();
          fetchFloorSummaries();
          fetchAnalytics();
          if (selected && msg.data && msg.data.cluster_id === selected.id) {
            fetchDetail(selected.id);
          }
          toast.success("Incident cluster verified & closed");
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
    if (ms <= 0) return { text: "Breached", urgent: true };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return {
      text: h > 0 ? `${h}h ${m}m remaining` : m > 0 ? `${m}m ${s}s` : `${s}s`,
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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Navbar />

      {/* Top Urgent Alert Banner if any critical incidents exist */}
      {activeEmergencies.length > 0 && (
        <div className="relative z-20 flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-600" />
            <span className="font-bold uppercase tracking-wider text-red-900">High-Priority Alert:</span>
            <span>
              {activeEmergencies.length} urgent incident(s) requiring immediate dispatch.
            </span>
          </div>
          <button
            onClick={() => {
              const emerg = activeEmergencies[0];
              if (emerg) {
                setActiveFloor(emerg.floor.toUpperCase());
                fetchDetail(emerg.id);
              }
            }}
            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 transition cursor-pointer"
          >
            Locate Incident →
          </button>
        </div>
      )}

      {/* ── Subheader Bar with Analytics Toggle & Memo ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building size={15} className="text-indigo-600" />
          <span className="font-bold text-slate-900">Mission Control</span>
          <span>·</span>
          <span>10-Storey Campus Operations Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showCharts ? "primary" : "outline"}
            onClick={() => setShowCharts((v) => !v)}
            className="text-xs h-8 py-0 font-semibold"
          >
            <BarChart3 size={13} /> Analytics Drawer
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowMemo(true)}
            className="text-xs h-8 py-0 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText size={13} /> Incident Memo
          </Button>
        </div>
      </div>

      {/* ── Main Content: Elevator Shaft + Floor Plan Canvas + Detail Panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── 1. Elevator Vertical Floor Selector (Left Rail) ── */}
        <div className="w-[115px] shrink-0 border-r border-slate-200 bg-white p-2">
          <ElevatorFloorNavigator
            selectedFloor={activeFloor}
            onSelectFloor={(f) => setActiveFloor(f)}
            floorSummaries={floorSummaries}
          />
        </div>

        {/* ── 2. Center: Tactical Floor Plan Blueprint Workspace ── */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-slate-50">
          {/* Floor Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Floor {activeFloor}</span>
              <span className="text-slate-500">· {activeFloorMeta.label}</span>
              <Badge variant="outline" className="text-[10px] py-0">
                {activeFloorClusters.length}{" "}
                {activeFloorClusters.length === 1 ? "issue" : "issues"}
              </Badge>
            </div>

            {/* AI Natural Language Filter Bar */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <Search size={13} className="text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search: 'leak', 'lab', 'door'…"
                className="bg-transparent text-slate-900 text-xs outline-none w-32 sm:w-48 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Heatmap toggle */}
              <button
                onClick={() => setHeatmapMode((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  heatmapMode
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Flame size={13} />
                <span>Heatmap</span>
              </button>

              <button
                onClick={() => setShowRoomLabels((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  showRoomLabels ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Eye size={13} />
                <span>Labels</span>
              </button>

              <button
                onClick={() => setPlanTheme(planTheme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                {planTheme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                <span>{planTheme === "dark" ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>

          {/* Category & Urgency Quick Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white/70 px-4 py-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Category:</span>
            {["ALL", "IT_SUPPORT", "MAINTENANCE", "HOUSEKEEPING", "FACILITIES"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  filterCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "All" : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}

            <span className="text-slate-300 mx-1">|</span>

            <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Urgency:</span>
            {["ALL", "EMERGENCY", "HIGH", "MEDIUM", "LOW"].map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  filterTier === tier
                    ? tier === "EMERGENCY" ? "bg-red-600 text-white shadow-xs font-bold" :
                      tier === "HIGH" ? "bg-amber-600 text-white shadow-xs font-bold" :
                      tier === "MEDIUM" ? "bg-orange-600 text-white shadow-xs font-bold" :
                      "bg-emerald-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Facility Health Gauge */}
          <div className="px-4 pt-3">
            <FacilityHealthGauge
              score={fhiScore}
              openIncidents={activeFloorClusters.length}
              emergencyCount={emergencyCountOnFloor}
              floorLabel={`Floor ${activeFloor}`}
            />
          </div>

          {/* Blueprint SVG Canvas Area */}
          <div className="relative flex-1 overflow-hidden p-3 flex items-center justify-center">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading campus layout and incidents…
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
                className="h-full w-full max-w-[500px]"
              />
            )}
          </div>

          {/* KPI Stat Bar (Below Canvas) */}
          <div className="relative z-10 grid grid-cols-2 border-t border-slate-200 bg-white sm:grid-cols-4 shadow-xs">
            {[
              {
                label: "Building Open Issues",
                value: analytics?.open_clusters ?? clusters.filter((c) => c.status !== "CLOSED").length,
                icon: Layers,
                color: "text-indigo-600",
              },
              {
                label: "Highest Risk Floor",
                value: highestRiskFloor ? `Floor ${highestRiskFloor}` : "Stable",
                icon: AlertTriangle,
                color: highestRiskFloor ? "text-red-600" : "text-emerald-600",
              },
              {
                label: "SLA Breach Rate",
                value: analytics ? `${(analytics.sla_breach_rate * 100).toFixed(0)}%` : "0%",
                icon: Clock,
                color: analytics && analytics.sla_breach_rate > 0.1 ? "text-red-600" : "text-emerald-600",
              },
              {
                label: "Top Category",
                value: analytics ? CATEGORY_LABELS[analytics.top_category] ?? analytics.top_category : "—",
                icon: BarChart3,
                color: "text-slate-700",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-3 border-r border-slate-200 px-4 py-3 last:border-r-0">
                <kpi.icon size={17} className={kpi.color} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{kpi.value}</div>
                  <div className="truncate text-[10px] uppercase font-bold tracking-wider text-slate-500">
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
                className="absolute bottom-[54px] left-0 right-0 z-30 border-t border-slate-200 bg-white p-5 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Campus Facility Intelligence Analytics</span>
                  <button onClick={() => setShowCharts(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <AnalyticsCharts refreshToken={analytics?.open_clusters ?? 0} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 3. Right: Cluster Detail & Action Flyout ── */}
        <aside className="flex w-[400px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white">
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
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5 shadow-2xs">
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
                    <h2 className="mt-2 text-base font-bold text-slate-900 leading-snug">{selected.title}</h2>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-semibold text-indigo-700">
                        <MapPin size={12} /> Floor {selected.floor}
                        {selected.room_or_zone ? ` · ${selected.room_or_zone}` : ""}
                      </span>
                      <span>·</span>
                      <span>{CATEGORY_LABELS[selected.category] ?? selected.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 space-y-4 p-5">
                  {/* AI Summary */}
                  {selected.ai_summary && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                        <Activity size={13} className="text-indigo-600" /> Executive AI Summary
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700">{selected.ai_summary}</p>
                    </div>
                  )}

                  {/* Priority Radial Gauge */}
                  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <PriorityGauge score={selected.priority_score} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                    <span>Severity: {selected.severity_score}/5</span>
                    <span>Impact: {selected.impact_score}/5</span>
                    <span className="font-semibold text-slate-800">{selected.complaint_count} reports merged</span>
                  </div>

                  {/* SLA Countdown */}
                  {(() => {
                    const sla = slaRemaining(selected.sla_deadline);
                    if (!sla) return null;
                    return (
                      <div
                        className={`rounded-xl border p-4 ${
                          sla.urgent
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold">
                            <Clock size={13} /> Target SLA Window
                          </span>
                          <span className="font-semibold text-xs">
                            {sla.text}
                          </span>
                        </div>
                        {selected.sla_deadline && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Deadline: {new Date(selected.sla_deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Assign Technician */}
                  {selected.status !== "RESOLVED" && selected.status !== "CLOSED" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <UserCheck size={14} className="text-indigo-600" /> Assign Field Technician
                      </div>
                      <div className="flex gap-2">
                        <select
                          id="tech-select"
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
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
                          className="px-3.5 py-1 text-xs"
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

                  {/* Incident Memo Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMemo(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs h-9 font-semibold"
                  >
                    <FileText size={14} className="text-indigo-600" /> Generate Official Incident Memo
                  </Button>

                  {/* Child Reports */}
                  <div>
                    <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Layers size={13} className="text-indigo-600" /> Merged Submissions ({selected.complaints?.length ?? 0})
                    </h3>
                    <div className="space-y-2.5">
                      {selected.complaints?.map((c: Complaint) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-900">{c.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                {c.description}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-700 font-semibold">
                                <MapPin size={10} /> Floor {c.floor}
                                {c.room_or_zone ? ` · ${c.room_or_zone}` : ""}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              Sev {c.severity}/5
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
                              className="mt-2.5 max-h-24 rounded-lg object-cover border border-slate-200"
                            />
                          )}
                          <p className="mt-2 text-[10px] text-slate-400">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Building size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Select an Incident Pin</h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-xs">
                  Click on any incident marker on Floor {activeFloor} or switch building levels on the elevator panel to inspect details and dispatch staff.
                </p>
                <p className="mt-4 text-xs font-semibold text-slate-400">
                  {clusters.length} active issue cluster(s) across 10 floors
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* Incident Memo Modal */}
      <IncidentMemoModal
        cluster={selected}
        open={showMemo}
        onClose={() => setShowMemo(false)}
      />

      {/* Floating CampBot AI Assistant */}
      <CampBotChat />
    </div>
  );
}
