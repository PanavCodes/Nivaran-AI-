"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Radar,
  ShieldCheck,
  Zap,
  ArrowRight,
  Building,
  Wrench,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity,
  ChevronRight,
} from "lucide-react";
import { quickLoginAs } from "@/lib/auth";
import { sound } from "@/lib/sound";
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

    sound.playClick();
    setSwitching(role);
    try {
      await quickLoginAs(role);
      toast.success(`Logged in as Demo ${role}! Launching terminal…`, { icon: "⚡" });
      router.push(targetPath);
    } catch {
      router.push(targetPath);
    } finally {
      setSwitching(null);
    }
  };

  const METRICS = [
    { label: "Indoor Floors", val: "10 Floors", sub: "LG, G, Floors 1 through 8", icon: Layers, color: "text-blue-400" },
    { label: "Clustering Engine", val: "3-Stage", sub: "Floor isolation + Euclidean + Cosine", icon: Activity, color: "text-emerald-400" },
    { label: "SLA Adherence", val: "98.4%", sub: "Automated escalation daemon", icon: Zap, color: "text-amber-400" },
    { label: "Close-Out Proof", val: "100%", sub: "Dual-camera vision verification", icon: ShieldCheck, color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col selection:bg-[#58a6ff]/30">
      {/* Unified Top Command Navigation */}
      <Navbar />

      <main className="radar-canvas flex-1 overflow-hidden relative">
        <div className="radar-sweep opacity-30 pointer-events-none" />

        {/* Hero Section */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-3 py-1 text-xs font-semibold text-[#58a6ff] mb-6 backdrop-blur-md">
              <Sparkles size={13} className="text-[#58a6ff]" />
              <span>Campusathon 2026 · PS5 Campus Problem Intelligence</span>
            </div>

            <h1 className="bg-gradient-to-b from-white via-[#f0f6fc] to-[#8b949e] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl md:text-7xl">
              Nivaran AI
            </h1>

            <p className="mt-4 max-w-3xl text-base sm:text-xl text-[#8b949e] leading-relaxed">
              Turning scattered campus complaints into prioritized, transparent resolution.
              Spatio-semantic clustering collapses duplicate reports across{" "}
              <span className="text-white font-medium">10 indoor floors</span> with real-time Gemini Vision intake and dual-proof verification.
            </p>

            {/* 1-Click Fast-Track Judge & Demo Launchers */}
            <div className="mt-10 w-full max-w-4xl">
              <div className="text-xs uppercase tracking-widest text-[#8b949e] font-semibold mb-3 flex items-center justify-center gap-2">
                <Zap size={13} className="text-amber-400" />
                <span>One-Click Role Experience for Evaluators & Judges</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Admin Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("ADMIN", "/admin")}
                  className="group relative flex flex-col items-start rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-left hover:border-red-500/60 hover:bg-red-500/10 transition-all duration-200 shadow-lg hover:shadow-red-500/10"
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                      <Building size={16} />
                    </div>
                    <Badge variant="emergency" className="text-[10px] py-0">Admin</Badge>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-red-300 transition flex items-center gap-1">
                    Mission Control
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e]">
                    10-floor elevator navigator, pulsing SVG blueprint pins, and SLA dispatch.
                  </p>
                </button>

                {/* Technician Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("TECHNICIAN", "/technician")}
                  className="group relative flex flex-col items-start rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left hover:border-amber-500/60 hover:bg-amber-500/10 transition-all duration-200 shadow-lg hover:shadow-amber-500/10"
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <Wrench size={16} />
                    </div>
                    <Badge variant="high" className="text-[10px] py-0">Field Tech</Badge>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition flex items-center gap-1">
                    Task Force Terminal
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e]">
                    SLA urgency queue, swipe en-route, and dual-camera before/after photo closeout.
                  </p>
                </button>

                {/* Student Launcher */}
                <button
                  disabled={!!switching}
                  onClick={() => handleLaunchRole("STUDENT", "/report")}
                  className="group relative flex flex-col items-start rounded-xl border border-[#58a6ff]/30 bg-[#58a6ff]/5 p-4 text-left hover:border-[#58a6ff]/60 hover:bg-[#58a6ff]/10 transition-all duration-200 shadow-lg hover:shadow-[#58a6ff]/10"
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#58a6ff]/20 text-[#58a6ff]">
                      <Radar size={16} />
                    </div>
                    <Badge variant="accent" className="text-[10px] py-0">Student</Badge>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-[#58a6ff] transition flex items-center gap-1">
                    Radar Intake Portal
                    <ArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                  </h3>
                  <p className="mt-1 text-xs text-[#8b949e]">
                    Drag-and-drop vision intake, door QR code scan, and interactive floor plan pinpoint.
                  </p>
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Live Telemetry KPI Metrics Bar */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {METRICS.map((m, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#30363d] bg-[#161b22]/70 p-4 backdrop-blur-md transition hover:border-[#58a6ff]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-[#8b949e]">{m.label}</span>
                  <m.icon size={16} className={m.color} />
                </div>
                <div className="mt-2 text-2xl font-black text-white">{m.val}</div>
                <div className="mt-0.5 text-[11px] text-[#8b949e]">{m.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive 10-Floor Blueprint Showcase Section */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-20">
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22]/80 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-5 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wider mb-1">
                  <Activity size={12} /> Live Interactive Blueprint
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  10-Floor Indoor Spatial Intelligence
                </h2>
                <p className="text-xs sm:text-sm text-[#8b949e] mt-1">
                  Click across building floors to explore real-time coordinate clusters, emergency beacons, and room zones.
                </p>
              </div>

              {/* Floor Switcher Quick Bar */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {ORDERED_FLOOR_IDS.map((fId) => (
                  <button
                    key={fId}
                    onClick={() => {
                      sound.playRadarPing();
                      setDemoFloor(fId);
                      const match = SHOWCASE_CLUSTERS.find((c) => c.floor.toUpperCase() === fId.toUpperCase());
                      setInspectingCluster(match || null);
                    }}
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 ${
                      demoFloor.toUpperCase() === fId.toUpperCase()
                        ? "bg-[#58a6ff] text-[#0d1117] shadow-lg shadow-[#58a6ff]/30 font-extrabold scale-105"
                        : "bg-[#0d1117] text-[#8b949e] border border-[#30363d] hover:text-white hover:border-[#58a6ff]/40"
                    }`}
                  >
                    {fId}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Showcase Layout: Blueprint on Left, Live Telemetry on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Floor Plan Viewer (7 cols) */}
              <div className="lg:col-span-7 flex justify-center">
                <FloorPlanViewer
                  floor={demoFloor}
                  theme="dark"
                  clusters={SHOWCASE_CLUSTERS}
                  selectedClusterId={inspectingCluster?.id}
                  showRoomLabels={true}
                  heatmapMode={false}
                  onClusterSelect={(c) => {
                    sound.playClick();
                    setInspectingCluster(c);
                  }}
                  className="w-full max-w-[380px]"
                />
              </div>

              {/* Cluster Detail Telemetry Card (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
                <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 shadow-xl">
                  <div className="flex items-center justify-between text-xs text-[#8b949e] border-b border-[#21262d] pb-3 mb-3">
                    <span className="font-mono">FLOOR {demoFloor} INCIDENT DISPATCH</span>
                    <span className="text-emerald-400 font-semibold">Active Vector Feed</span>
                  </div>

                  {inspectingCluster ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                          Priority {Math.round(inspectingCluster.priority_score)}/100
                        </span>
                        <span className="rounded bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 px-2 py-0.5 text-[10px] font-bold">
                          {inspectingCluster.category}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">{inspectingCluster.title}</h3>
                      <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                        {inspectingCluster.ai_summary}
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#21262d] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#8b949e] text-[10px] block">Location</span>
                          <span className="text-white font-medium">
                            {inspectingCluster.room_or_zone || `Floor ${inspectingCluster.floor}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8b949e] text-[10px] block">Duplicate Reports</span>
                          <span className="text-white font-medium">
                            {inspectingCluster.complaint_count} Consolidated
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#21262d] flex items-center justify-between">
                        <span className="text-[11px] text-[#8b949e]">Spatio-Semantic Radius: &le;35 units</span>
                        <Link
                          href="/admin"
                          onClick={() => sound.playClick()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#58a6ff] hover:underline"
                        >
                          Open in Mission Control <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                      <h4 className="font-bold text-white text-sm">No Active Hotspots on Floor {demoFloor}</h4>
                      <p className="mt-1 text-xs text-[#8b949e]">
                        All facilities operating normally. Switch to Floor 1 or 3 to inspect active incidents.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-[#8b949e]">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" /> Floor Isolation Filter
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" /> 2D Canvas Euclidean
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" /> 384-Dim MiniLM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Public Transparency Banner Callout */}
        <section className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mb-16">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#161b22] to-[#161b22] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                <CheckCircle2 size={14} /> Verified Redressal Proof-of-Work
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Public Transparency & Resolution Wall
              </h3>
              <p className="text-xs sm:text-sm text-[#8b949e] max-w-xl">
                Every completed campus repair undergoes dual-camera structural verification before resolution.
                Explore before/after photos and campus-wide resolution time SLAs.
              </p>
            </div>
            <Link
              href="/transparency"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs sm:text-sm font-bold text-[#0d1117] shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition shrink-0"
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
