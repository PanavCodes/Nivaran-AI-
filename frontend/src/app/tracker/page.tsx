"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Loader2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";

import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDeniedBarrier } from "@/components/auth/AccessDeniedBarrier";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { StudentPortalNav } from "@/components/layout/StudentPortalNav";
import { CampBotChat } from "@/components/chat/CampBotChat";
import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import type { MyComplaint } from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;
const statusLabels: Record<string, string> = {
  OPEN: "Open — awaiting assignment",
  ASSIGNED: "Assigned to a technician",
  IN_PROGRESS: "Technician en route / active repair",
  RESOLVED: "Resolved — verified by photo proof",
  CLOSED: "Closed",
};

const STAGES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] as const;
function stageIndex(status: string | undefined): number {
  if (!status) return -1;
  const i = STAGES.indexOf(status as (typeof STAGES)[number]);
  return i === -1 ? (status === "CLOSED" ? 3 : 0) : i;
}

const FALLBACK_MY_COMPLAINTS: MyComplaint[] = [
  {
    id: "rep-demo-01",
    user_id: "demo-u-1",
    title: "Water leaking near server room door",
    description: "Ceiling pipe continuous dripping near electrical conduit and switchboard. Water pooling on floor creating slip hazard.",
    category: "MAINTENANCE",
    severity: 4,
    floor: "1",
    x_coord: 40,
    y_coord: 196,
    room_or_zone: "Room 102 (Server Room)",
    cluster_id: "demo-c-1",
    image_url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&auto=format&fit=crop&q=80",
    resolution_proof_url: null,
    resolution_similarity_score: null,
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    cluster: {
      id: "demo-c-1",
      title: "AC Condensate Pipe Leaking near Switchboard",
      category: "MAINTENANCE",
      status: "IN_PROGRESS",
      priority_score: 82.5,
      sla_tier: "EMERGENCY",
      complaint_count: 4,
      floor: "1",
      room_or_zone: "Room 102 (Server Room)",
      sla_deadline: new Date(Date.now() + 3600 * 1000 * 1.5).toISOString(),
      assigned_department: "MAINTENANCE",
    },
  },
  {
    id: "rep-demo-02",
    user_id: "demo-u-2",
    title: "Loose High-Voltage Conduit Sparks near Projector Mount",
    description: "Exposed wire conduit near ceiling mount in Hardware Lab 1. Requires electrical isolation before lab practical.",
    category: "IT_SUPPORT",
    severity: 5,
    floor: "3",
    x_coord: 225,
    y_coord: 490,
    room_or_zone: "Hardware Lab 1",
    cluster_id: "demo-c-2",
    image_url: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=600&auto=format&fit=crop&q=80",
    resolution_proof_url: null,
    resolution_similarity_score: null,
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    cluster: {
      id: "demo-c-2",
      title: "Loose High-Voltage Conduit Sparks",
      category: "IT_SUPPORT",
      status: "ASSIGNED",
      priority_score: 76.0,
      sla_tier: "HIGH",
      complaint_count: 3,
      floor: "3",
      room_or_zone: "Hardware Lab 1",
      sla_deadline: new Date(Date.now() + 3600 * 1000 * 4.5).toISOString(),
      assigned_department: "IT_SUPPORT",
    },
  },
  {
    id: "rep-demo-03",
    user_id: "demo-u-3",
    title: "Broken Fire Exit Door Hydraulic Closer",
    description: "Heavy main entrance door slamming shut violently without hydraulic damping.",
    category: "FACILITIES",
    severity: 2,
    floor: "G",
    x_coord: 180,
    y_coord: 440,
    room_or_zone: "Main Entrance Foyer",
    cluster_id: "demo-c-3",
    image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
    resolution_proof_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    resolution_similarity_score: 0.94,
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    cluster: {
      id: "demo-c-3",
      title: "Fire Exit Door Hydraulic Closer Broken",
      category: "FACILITIES",
      status: "RESOLVED",
      priority_score: 35.0,
      sla_tier: "MEDIUM",
      complaint_count: 2,
      floor: "G",
      room_or_zone: "Main Entrance Foyer",
      sla_deadline: null,
      assigned_department: "FACILITIES",
    },
  },
];

export default function TrackerPage() {
  const [reports, setReports] = useState<MyComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [expandedBlueprint, setExpandedBlueprint] = useState<Record<string, boolean>>({});

  const {
    user: authUser,
    isAuthorized,
    isLoading: authLoading,
    destinationPath,
    destinationLabel,
  } = useRoleGuard({
    allowedRoles: ["STUDENT", "ADMIN"],
    portalName: "Incident Status Tracker",
    customMessage: "Maintenance Crew accounts are restricted to the Work Orders console. Please use Student or Admin role to view the status tracker.",
  });

  const fetchReports = useCallback(async () => {
    let apiReports: MyComplaint[] = [];
    try {
      const data = await api.get<MyComplaint[]>("/api/v1/complaints/mine");
      if (Array.isArray(data)) {
        apiReports = data;
      }
    } catch (err) {
      console.warn("[Tracker] Failed to load complaints from API:", err);
    }

    // Read any locally submitted reports
    let localReports: MyComplaint[] = [];
    try {
      const stored = localStorage.getItem("nivaran_my_reports");
      if (stored) {
        localReports = JSON.parse(stored);
      }
    } catch {}

    const combined = [...localReports, ...apiReports];
    if (combined.length === 0) {
      setReports(FALLBACK_MY_COMPLAINTS);
    } else {
      const seen = new Set<string>();
      const deduped: MyComplaint[] = [];
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
      setReports(deduped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
    return {
      text: h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`,
      urgent: ms < 30 * 60 * 1000,
    };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">Verifying student authorization...</p>
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
          portalName="Student Incident Status Tracker"
          allowedRoles={["STUDENT", "ADMIN"]}
          userRole={authUser?.role}
          homePath={destinationPath}
          homeLabel={destinationLabel}
          customMessage="Maintenance Crew accounts are restricted from the Student Status Tracker. Please return to your designated workspace."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <StudentPortalNav />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Incident Status Tracker
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track resolution milestones, SLA commitments, and verified before/after proof.
            </p>
          </div>
          <Link href="/report">
            <Button size="sm" className="text-xs h-9 px-3.5">
              Report new issue
            </Button>
          </Link>
        </div>

        <div className="mx-auto max-w-4xl space-y-4">
          {loading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          )}

          {!loading && reports.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border border-slate-200 bg-white">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                    <ImageIcon size={24} />
                  </div>
                  <h2 className="mt-2 text-base font-bold text-slate-900">No reported issues yet</h2>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">
                    Reports submitted by you or merged into campus incident clusters will appear here in real time.
                  </p>
                  <Link href="/report" className="mt-5">
                    <Button>Submit Your First Report</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {reports.map((r, i) => {
            const cluster = r.cluster;
            const tier = cluster ? tierForScore(cluster.priority_score) : null;
            const sla = slaRemaining(cluster?.sla_deadline ?? null);
            const stage = stageIndex(cluster?.status);
            const proofUrl = r.resolution_proof_url
              ? r.resolution_proof_url.startsWith("http")
                ? r.resolution_proof_url
                : `${API_URL}${r.resolution_proof_url}`
              : null;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <Card className="border border-slate-200 bg-white shadow-xs">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{r.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">{r.description}</p>
                        
                        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1 font-semibold text-indigo-700">
                            <MapPin size={12} /> Floor {r.floor}
                            {r.room_or_zone ? ` · ${r.room_or_zone}` : ""}
                          </span>
                          <span>·</span>
                          <span>{CATEGORY_LABELS[r.category] ?? r.category}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {new Date(r.created_at).toLocaleDateString()} at {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>·</span>
                          <button
                            onClick={() =>
                              setExpandedBlueprint((prev) => ({
                                ...prev,
                                [r.id]: !prev[r.id],
                              }))
                            }
                            className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                          >
                            {expandedBlueprint[r.id] ? "Hide blueprint" : "View on floor plan"}
                          </button>
                        </div>
                      </div>

                      {cluster && tier && (
                        <Badge variant={tierVariant[tier as keyof typeof tierVariant] ?? "default"}>
                          {tier} · Score {Math.round(cluster.priority_score)}
                        </Badge>
                      )}
                    </div>

                    {/* Optional expanded floor plan blueprint */}
                    {expandedBlueprint[r.id] && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold text-slate-600">
                          Spatial Pin: Floor {r.floor} ({Math.round(r.x_coord)}, {Math.round(r.y_coord)})
                        </div>
                        <FloorPlanViewer
                          floor={r.floor}
                          theme="light"
                          interactive={false}
                          activePin={{ x: r.x_coord, y: r.y_coord, room: r.room_or_zone }}
                          className="h-44 w-full"
                          showRoomLabels={false}
                        />
                      </div>
                    )}

                    {/* Resolution-stage timeline */}
                    {cluster && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <div className="flex items-center">
                          {STAGES.map((s, idx) => (
                            <div key={s} className="flex flex-1 items-center last:flex-none">
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                  idx < stage
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                    : idx === stage
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                                    : "border-slate-200 bg-slate-50 text-slate-400"
                                }`}
                              >
                                {idx < stage ? "✓" : idx + 1}
                              </div>
                              {idx < STAGES.length - 1 && (
                                <div
                                  className={`h-0.5 flex-1 ${
                                    idx < stage ? "bg-emerald-500" : "bg-slate-200"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          {STAGES.map((s) => (
                            <span key={s} className="w-20 first:text-left last:text-right text-center">
                              {s === "IN_PROGRESS" ? "In Progress" : s[0] + s.slice(1).toLowerCase()}
                            </span>
                          ))}
                        </div>
                        
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800">
                            Status: {statusLabels[cluster.status] ?? cluster.status}
                            {cluster.status !== "RESOLVED" && cluster.status !== "CLOSED" && (
                              <span className="text-slate-500 font-normal"> — Assigned to {cluster.assigned_department}</span>
                            )}
                          </p>

                          {sla && cluster.status !== "RESOLVED" && cluster.status !== "CLOSED" && (
                            <span
                              className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                sla.urgent
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <Clock size={11} /> SLA {sla.text}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Images: your report + verified resolution proof */}
                    <div className="mt-4 flex flex-wrap gap-4">
                      {r.image_url && (
                        <div>
                          <p className="mb-1 text-[10px] uppercase font-bold text-slate-500">Original Photo</p>
                          <div className="relative h-28 w-40 overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
                            <Image
                              src={r.image_url.startsWith("http") ? r.image_url : `${API_URL}${r.image_url}`}
                              alt="Reported issue"
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="160px"
                            />
                          </div>
                        </div>
                      )}
                      {proofUrl && (
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-700">
                            <ShieldCheck size={12} /> Resolution Proof
                          </p>
                          <div className="relative h-28 w-40 overflow-hidden rounded-xl border border-emerald-200 shadow-2xs">
                            <Image
                              src={proofUrl}
                              alt="Resolution proof"
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="160px"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {cluster?.status === "RESOLVED" && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Verified and resolved by {cluster.assigned_department} with photographic evidence.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        </div>
      </main>

      <CampBotChat />
    </div>
  );
}
