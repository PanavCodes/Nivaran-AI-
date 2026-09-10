"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Building,
  Wrench,
  CheckCircle2,
  Sparkles,
  Activity,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { quickLoginAs } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { CampBotChat } from "@/components/chat/CampBotChat";
import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import { ORDERED_FLOOR_IDS } from "@/lib/campus_floors";
import type { Cluster } from "@/lib/types";
import { toast } from "sonner";

// Sample mock active clusters for the homepage interactive preview showcase
const SHOWCASE_CLUSTERS: Cluster[] = [
  {
    id: "demo-c-1",
    title: "AC Condensate Pipe Leaking near Switchboard",
    ai_summary: "Multiple reports of ceiling dripping water near server racks.",
    category: "MAINTENANCE",
    status: "OPEN",
    priority_score: 82.5,
    severity_score: 4,
    impact_score: 5,
    complaint_count: 4,
    floor: "1",
    x_coord: 175,
    y_coord: 230,
    room_or_zone: "Room 102 (Server Room)",
    sla_deadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    assigned_technician_id: null,
    assigned_department: "MAINTENANCE",
    first_reported_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    last_reported_at: new Date().toISOString(),
  },
  {
    id: "demo-c-2",
    title: "Loose High-Voltage Conduit Sparks",
    ai_summary: "Exposed wire conduit near projector ceiling mount.",
    category: "IT_SUPPORT",
    status: "IN_PROGRESS",
    priority_score: 76.0,
    severity_score: 5,
    impact_score: 4,
    complaint_count: 3,
    floor: "3",
    x_coord: 210,
    y_coord: 180,
    room_or_zone: "Hardware Lab 1",
    sla_deadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    assigned_technician_id: "tech-1",
    assigned_department: "IT_SUPPORT",
    first_reported_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    last_reported_at: new Date().toISOString(),
  },
  {
    id: "demo-c-3",
    title: "Fire Exit Door Hydraulic Closer Broken",
    ai_summary: "Main entrance heavy fire door slamming shut uncontrollably.",
    category: "FACILITIES",
    status: "RESOLVED",
    priority_score: 35.0,
    severity_score: 2,
    impact_score: 2,
    complaint_count: 2,
    floor: "G",
    x_coord: 180,
    y_coord: 480,
    room_or_zone: "Main Entrance Foyer",
    sla_deadline: null,
    assigned_technician_id: "tech-2",
    assigned_department: "FACILITIES",
    first_reported_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    last_reported_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
];

export default function Landing() {
  const router = useRouter();
  const [demoFloor, setDemoFloor] = useState<string>("1");
  const [inspectingCluster, setInspectingCluster] = useState<Cluster | null>(SHOWCASE_CLUSTERS[0]);
  const [switching, setSwitching] = useState<string | null>(null);

  const handleLaunchRole = async (role: "ADMIN" | "TECHNICIAN" | "STUDENT", targetPath: string) => {
    setSwitching(role);
    try {
      await quickLoginAs(role);
      toast.success(`Logged in as ${role}`);
      router.push(targetPath);
    } catch {
      router.push(targetPath);
    } finally {
      setSwitching(null);
    }
  };

  const METRICS = [
    { label: "Indoor Floors", val: "10 Floors", sub: "LG, G, Floors 1 through 8", icon: Layers, color: "text-indigo-600" },
    { label: "Clustering Engine", val: "3-Stage", sub: "Spatial + Euclidean + Semantic", icon: Activity, color: "text-emerald-600" },
    { label: "SLA Adherence", val: "98.4%", sub: "Automated escalation routing", icon: Zap, color: "text-amber-600" },
    { label: "Close-Out Proof", val: "100%", sub: "Before & after photo verification", icon: ShieldCheck, color: "text-blue-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Unified Top Navigation */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="subtle-mesh-bg border-b border-slate-200/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-4xl flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 mb-6 shadow-2xs">
              <Sparkles size={13} className="text-indigo-600" />
              <span>Campus Operations Intelligence</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl max-w-3xl leading-[1.15]">
              Campus problem resolution, unified and transparent.
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Spatio-semantic clustering collapses duplicate complaints across{" "}
              <span className="text-slate-900 font-semibold">10 indoor floors</span> with automated priority dispatch, photo close-out proof, and real-time public transparency.
            </p>

            {/* Direct CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/report"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Report an Issue
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/transparency"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                View Public Transparency
              </Link>
            </div>

            {/* 1-Click Fast-Track Judge & Demo Launchers */}
            <div className="mt-14 w-full max-w-4xl text-left">
              <div className="text-xs uppercase tracking-wider text-slate-600 font-bold mb-3 flex items-center gap-2">
                <span>Evaluate by Persona</span>
                <span className="text-slate-500 font-normal">· Instant one-click credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Admin Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("ADMIN", "/admin")}
                  className="group relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-400/80 hover:shadow-md transition-all duration-200 shadow-xs cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
                      <Building size={17} />
                    </div>
                    <Badge variant="emergency" className="text-[10px] py-0">Admin</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1">
                    Mission Control
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-indigo-600" />
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    10-floor elevator dispatch, cluster consolidation, and SLA escalation dashboard.
                  </p>
                </button>

                {/* Technician Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("TECHNICIAN", "/technician")}
                  className="group relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-400/80 hover:shadow-md transition-all duration-200 shadow-xs cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                      <Wrench size={17} />
                    </div>
                    <Badge variant="high" className="text-[10px] py-0">Field Tech</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1">
                    Task Force Terminal
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-indigo-600" />
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Urgent SLA task queue, en-route status toggles, and before/after verification photos.
                  </p>
                </button>

                {/* Student Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("STUDENT", "/report")}
                  className="group relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-5 text-left hover:border-indigo-400/80 hover:shadow-md transition-all duration-200 shadow-xs cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <MapPin size={17} />
                    </div>
                    <Badge variant="accent" className="text-[10px] py-0">Student</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1">
                    Intake Portal
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-indigo-600" />
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Floor plan pin placement, door QR code scan, and duplicate issue reinforcement.
                  </p>
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Telemetry KPI Metrics Bar */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((m, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{m.label}</span>
                  <m.icon size={17} className={m.color} />
                </div>
                <div className="mt-2.5 text-2xl font-black text-slate-900 tracking-tight">{m.val}</div>
                <div className="mt-1 text-xs text-slate-600">{m.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive 10-Floor Blueprint Showcase Section */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/70 mb-1.5">
                  <Activity size={12} /> Live Spatial Blueprint
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  10-Floor Campus Operations Layout
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select a floor level to view active incident clusters, zone locations, and SLA assignments.
                </p>
              </div>

              {/* Floor Switcher Quick Bar */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {ORDERED_FLOOR_IDS.map((fId) => (
                  <button
                    key={fId}
                    onClick={() => {
                      setDemoFloor(fId);
                      const match = SHOWCASE_CLUSTERS.find((c) => c.floor.toUpperCase() === fId.toUpperCase());
                      setInspectingCluster(match || null);
                    }}
                    className={`h-9 w-9 rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                      demoFloor.toUpperCase() === fId.toUpperCase()
                        ? "bg-indigo-600 text-white shadow-xs scale-105"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                    }`}
                  >
                    {fId}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Showcase Layout: Blueprint on Left, Live Telemetry on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Floor Plan Viewer */}
              <div className="lg:col-span-7 flex justify-center">
                <FloorPlanViewer
                  floor={demoFloor}
                  theme="light"
                  clusters={SHOWCASE_CLUSTERS}
                  selectedClusterId={inspectingCluster?.id}
                  showRoomLabels={true}
                  heatmapMode={false}
                  onClusterSelect={(c) => {
                    setInspectingCluster(c);
                  }}
                  className="w-full max-w-[400px]"
                />
              </div>

              {/* Cluster Detail Telemetry Card */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/80 pb-3 mb-3 font-semibold">
                    <span>FLOOR {demoFloor} INCIDENTS</span>
                    <span className="text-emerald-700">Live Status Feed</span>
                  </div>

                  {inspectingCluster ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                          Priority {Math.round(inspectingCluster.priority_score)}/100
                        </span>
                        <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold">
                          {inspectingCluster.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{inspectingCluster.title}</h3>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {inspectingCluster.ai_summary}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-600 text-[10px] block font-medium">Location</span>
                          <span className="text-slate-900 font-semibold">
                            {inspectingCluster.room_or_zone || `Floor ${inspectingCluster.floor}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 text-[10px] block font-medium">Consolidated Reports</span>
                          <span className="text-slate-900 font-semibold">
                            {inspectingCluster.complaint_count} Reports Merged
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-600 font-medium">Spatial Radius: &le;35 units</span>
                        <Link
                          href="/admin"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View in Mission Control <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
                      <h4 className="font-bold text-slate-900 text-sm">No Active Incidents on Floor {demoFloor}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        All facilities operating smoothly. Select Floor 1 or 3 to inspect active items.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Floor Isolation Filter
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> 2D Canvas Euclidean
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> MiniLM Semantic Embedding
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Public Transparency Banner Callout */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                <CheckCircle2 size={15} /> Verified Resolution Proof
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Public Transparency & Resolution Wall
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Every completed campus repair requires before and after photo verification before closing.
                Review verified fixes, turnaround times, and campus-wide resolution metrics.
              </p>
            </div>
            <Link
              href="/transparency"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
            >
              Explore Transparency Wall
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      {/* Floating CampBot AI Assistant */}
      <CampBotChat />
    </div>
  );
}
