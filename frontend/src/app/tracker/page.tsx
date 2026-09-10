"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { requireAuth, type SessionUser } from "@/lib/auth";
import { sound } from "@/lib/sound";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { CampBotChat } from "@/components/chat/CampBotChat";
import { FloorPlanViewer } from "@/components/floorplan/FloorPlanViewer";
import type { MyComplaint } from "@/lib/types";
import { CATEGORY_LABELS, tierForScore } from "@/lib/types";

const tierVariant = { EMERGENCY: "emergency", HIGH: "high", MEDIUM: "medium", LOW: "resolved" } as const;
const statusLabels: Record<string, string> = {
  OPEN: "Open — awaiting assignment",
  ASSIGNED: "Assigned to a technician",
  IN_PROGRESS: "Technician en route / working",
  RESOLVED: "Resolved — proof verified",
  CLOSED: "Closed",
};

const STAGES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] as const;
function stageIndex(status: string | undefined): number {
  if (!status) return -1;
  const i = STAGES.indexOf(status as (typeof STAGES)[number]);
  return i === -1 ? (status === "CLOSED" ? 3 : 0) : i;
}

export default function TrackerPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reports, setReports] = useState<MyComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [expandedBlueprint, setExpandedBlueprint] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const u = requireAuth();
    if (u) setUser(u);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setReports(await api.get<MyComplaint[]>("/api/v1/complaints/mine"));
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
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
    if (ms <= 0) return { text: "BREACHED", urgent: true };
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return {
      text: h > 0 ? `${h}h ${m}m` : `${m}m`,
      urgent: ms < 30 * 60 * 1000,
    };
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />

      <main className="radar-canvas flex-1 p-4 md:p-8 relative">
        <div className="radar-sweep opacity-20 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#30363d] pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              My Incident Redressal Tracker
              <Badge variant="accent" className="text-[10px]">Live SLA</Badge>
            </h1>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Real-time status, cluster priority escalation, and dual-proof photo verification.
            </p>
          </div>
          <Link href="/report" onClick={() => sound.playClick()}>
            <Button size="sm" className="text-xs">
              + Report New Problem
            </Button>
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl space-y-4">

        {loading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-accent" size={22} />
          </div>
        )}

        {!loading && reports.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center py-14 text-center">
                <ImageIcon size={30} className="text-[#8b949e]" />
                <h2 className="mt-3 text-base font-bold text-white">No reports yet</h2>
                <p className="mt-1 text-sm text-[#8b949e]">
                  Every problem you report strengthens the campus intelligence layer.
                </p>
                <Link href="/report" className="mt-5">
                  <Button>Report your first issue</Button>
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
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white">{r.title}</h3>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#8b949e]">{r.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8b949e]">
                        <span className="flex items-center gap-0.5 font-semibold text-accent">
                          <MapPin size={10} /> Floor {r.floor}
                          {r.room_or_zone ? ` · ${r.room_or_zone}` : ""}
                        </span>
                        <span>·</span>
                        <span>{CATEGORY_LABELS[r.category] ?? r.category}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} /> {new Date(r.created_at).toLocaleString()}
                        </span>
                        <span>·</span>
                        <button
                          onClick={() =>
                            setExpandedBlueprint((prev) => ({
                              ...prev,
                              [r.id]: !prev[r.id],
                            }))
                          }
                          className="text-accent underline hover:text-accent/80"
                        >
                          {expandedBlueprint[r.id] ? "Hide blueprint" : "View on floor plan"}
                        </button>
                      </div>
                    </div>
                    {cluster && tier && (
                      <Badge variant={tierVariant[tier as keyof typeof tierVariant] ?? "default"}>
                        {tier} · P{cluster.priority_score}
                      </Badge>
                    )}
                  </div>

                  {/* Optional expanded floor plan blueprint */}
                  {expandedBlueprint[r.id] && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117] p-2">
                      <div className="mb-1 text-[10px] text-[#8b949e]">
                        Incident pinpointed on Floor {r.floor} ({Math.round(r.x_coord)}, {Math.round(r.y_coord)})
                      </div>
                      <FloorPlanViewer
                        floor={r.floor}
                        theme="dark"
                        interactive={false}
                        activePin={{ x: r.x_coord, y: r.y_coord, room: r.room_or_zone }}
                        className="h-40 w-full"
                        showRoomLabels={true}
                      />
                    </div>
                  )}

                  {/* Resolution-stage timeline (abstract: "progress monitored
                      through different resolution stages") */}
                  {cluster && (
                    <div className="mt-4">
                      <div className="flex items-center">
                        {STAGES.map((s, idx) => (
                          <div key={s} className="flex flex-1 items-center last:flex-none">
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                                idx < stage
                                  ? "border-resolved bg-resolved/20 text-resolved"
                                  : idx === stage
                                    ? "border-accent bg-accent/20 text-accent"
                                    : "border-[#30363d] text-[#8b949e]"
                              }`}
                            >
                              {idx < stage ? "✓" : idx + 1}
                            </div>
                            {idx < STAGES.length - 1 && (
                              <div
                                className={`h-0.5 flex-1 ${
                                  idx < stage ? "bg-resolved/50" : "bg-[#21262d]"
                                }`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-wide text-[#8b949e]">
                        {STAGES.map((s) => (
                          <span key={s} className="w-14 first:text-left last:text-right text-center">
                            {s === "IN_PROGRESS" ? "In progress" : s[0] + s.slice(1).toLowerCase()}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-[#c9d1d9]">
                        {statusLabels[cluster.status] ?? cluster.status}
                        {cluster.status !== "RESOLVED" && cluster.status !== "CLOSED" && (
                          <> — routed to {cluster.assigned_department}</>
                        )}
                      </p>
                      {sla && cluster.status !== "RESOLVED" && cluster.status !== "CLOSED" && (
                        <p
                          className={`mt-1 flex items-center gap-1 font-mono text-xs ${
                            sla.urgent ? "flash-red" : "text-[#8b949e]"
                          }`}
                        >
                          <Clock size={11} /> SLA {sla.text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Images: your report + verified resolution proof */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {r.image_url && (
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-[#8b949e]">Your photo</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.image_url.startsWith("http") ? r.image_url : `${API_URL}${r.image_url}`}
                          alt="Reported issue"
                          className="h-24 rounded-lg object-cover"
                        />
                      </div>
                    )}
                    {proofUrl && (
                      <div>
                        <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-resolved">
                          <ShieldCheck size={11} /> Resolution proof
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={proofUrl} alt="Resolution proof" className="h-24 rounded-lg object-cover" />
                      </div>
                    )}
                  </div>
                  {cluster?.status === "RESOLVED" && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-resolved">
                      <CheckCircle2 size={13} /> Dual-Proof Verified — issue closed by{" "}
                      {cluster.assigned_department}.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        </div>
      </main>

      <CampBotChat />
    </div>
  );
}

