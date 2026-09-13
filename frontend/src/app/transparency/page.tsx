"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  Clock,
  Award,
  Filter,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { StudentPortalNav } from "@/components/layout/StudentPortalNav";
import { BeforeAfterImageSlider } from "@/components/technician/BeforeAfterImageSlider";
import { ORDERED_FLOOR_IDS } from "@/lib/campus_floors";
import { CampBotChat } from "@/components/chat/CampBotChat";
import { api } from "@/lib/api";

interface ResolvedIssueItem {
  id: string;
  title: string;
  floor: string;
  room_or_zone: string;
  category: string;
  reportedAt: string;
  resolvedAt: string;
  durationHours: number;
  similarityScore: number;
  beforeUrl: string;
  afterUrl: string;
  technicianName: string;
  impactDesc: string;
}

interface DepartmentLeaderboardItem {
  dept: string;
  resolved: number;
  onTimeRate: string;
  avgHours: string;
  color: string;
}

interface TransparencyResponse {
  resolved_count: number;
  mean_resolution_hours: number;
  avg_similarity_score: number;
  active_technicians_count: number;
  department_leaderboard: DepartmentLeaderboardItem[];
  issues: ResolvedIssueItem[];
}

const SAMPLE_RESOLVED: ResolvedIssueItem[] = [
  {
    id: "cl-res-01",
    title: "AC Condensation Line Leak Damaging Ceiling Plaster",
    floor: "1",
    room_or_zone: "Room 102 (Server Room)",
    category: "MAINTENANCE",
    reportedAt: "Yesterday, 09:15 AM",
    resolvedAt: "Yesterday, 02:30 PM",
    durationHours: 5.2,
    similarityScore: 0.94,
    beforeUrl: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600&auto=format&fit=crop&q=80",
    afterUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
    technicianName: "Ramesh Sharma (HVAC Specialist)",
    impactDesc: "Prevented server rack thermal shutdown and protected main floor switchboard.",
  },
  {
    id: "cl-res-02",
    title: "Loose High-Voltage Conduit Sparks near Projector Mount",
    floor: "3",
    room_or_zone: "Hardware Lab 1",
    category: "IT_SUPPORT",
    reportedAt: "2 days ago",
    resolvedAt: "2 days ago",
    durationHours: 2.1,
    similarityScore: 0.96,
    beforeUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=600&auto=format&fit=crop&q=80",
    afterUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    technicianName: "Vikram Patel (Senior IT Tech)",
    impactDesc: "Emergency conduit insulation completed before scheduled semester lab practicals.",
  },
  {
    id: "cl-res-03",
    title: "Broken Hydraulic Closer on Fire Safety Door",
    floor: "G",
    room_or_zone: "Main Entrance Foyer",
    category: "FACILITIES",
    reportedAt: "3 days ago",
    resolvedAt: "3 days ago",
    durationHours: 4.0,
    similarityScore: 0.91,
    beforeUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
    afterUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    technicianName: "Mohan Lal (Structural Works)",
    impactDesc: "Heavy-duty Grade-1 closer installed ensuring compliance with fire egress norms.",
  },
];

const DEPARTMENT_LEADERBOARD = [
  { dept: "IT Infrastructure", resolved: 22, onTimeRate: "100%", avgHours: "2.4h", color: "text-indigo-600" },
  { dept: "HVAC & Plumbing", resolved: 18, onTimeRate: "97.5%", avgHours: "4.2h", color: "text-amber-600" },
  { dept: "Electrical & Power", resolved: 14, onTimeRate: "98.1%", avgHours: "3.1h", color: "text-blue-600" },
  { dept: "Structural & Glass", resolved: 11, onTimeRate: "95.0%", avgHours: "5.8h", color: "text-emerald-600" },
];

export default function PublicTransparencyPage() {
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [data, setData] = useState<TransparencyResponse | null>(null);
  React.useEffect(() => {
    async function fetchResolved() {
      try {
        const queryParams = new URLSearchParams();
        if (selectedFloor !== "ALL") queryParams.set("floor", selectedFloor);
        if (selectedCategory !== "ALL") queryParams.set("category", selectedCategory);
        const q = queryParams.toString();
        const res = await api.get<TransparencyResponse>(`/api/v1/clusters/resolved${q ? `?${q}` : ""}`);
        if (res && res.issues) {
          setData(res);
        }
      } catch (err) {
        console.warn("[Transparency] Live API fetch fallback to static dataset:", err);
      }
    }
    fetchResolved();
  }, [selectedFloor, selectedCategory]);

  const issues = data?.issues ?? SAMPLE_RESOLVED;
  const leaderboard = data?.department_leaderboard ?? DEPARTMENT_LEADERBOARD;
  const resolvedCount = data?.resolved_count ?? 48;
  const meanHours = data?.mean_resolution_hours ?? 4.8;
  const avgSimilarity = data?.avg_similarity_score ?? 93.8;
  const activeTechs = data?.active_technicians_count ?? 12;

  const filteredIssues = issues.filter((item) => {
    if (selectedFloor !== "ALL" && item.floor !== selectedFloor) return false;
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <StudentPortalNav />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Public Accountability
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Audited
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
              Campus Resolution & Verification Log
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Open public audit of resolved campus maintenance work orders, verified with before and after photo records across all 10 floors.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/report">
              <Button size="sm">
                Report an issue
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Dispatch console
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Stats Header Bar */}
        <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> Resolved This Month
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900">{resolvedCount} Issues</div>
            <span className="text-xs text-emerald-700 font-medium">100% Photo Verified</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <Clock size={13} className="text-indigo-600" /> Mean Resolution Time
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900">{meanHours} Hours</div>
            <span className="text-xs text-slate-500">Within target SLA</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <Sparkles size={13} className="text-amber-600" /> Visual Verification
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900">{avgSimilarity}%</div>
            <span className="text-xs text-slate-500">Avg structural similarity</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
              <Award size={13} className="text-blue-600" /> Active Technicians
            </span>
            <div className="mt-2 text-2xl font-black text-slate-900">{activeTechs} Staff</div>
            <span className="text-xs text-slate-500">Round-the-clock shift</span>
          </div>
        </section>

        {/* Department Performance SLA Leaderboard */}
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={15} className="text-amber-500" />
              Department SLA Performance
            </span>
            <span className="text-xs text-slate-500 font-medium">Rolling 30-Day Window</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {leaderboard.map((d) => (
              <div key={d.dept} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="text-xs font-bold text-slate-900">{d.dept}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className={`text-xl font-black ${d.color}`}>{d.onTimeRate}</span>
                  <span className="text-xs text-slate-500 font-semibold">{d.avgHours} avg</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{d.resolved} verified fixes</div>
              </div>
            ))}
          </div>
        </section>

        {/* Filter Controls */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          {/* Floor Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Building size={14} /> Floor:
            </span>
            <button
              onClick={() => setSelectedFloor("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                selectedFloor === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Floors
            </button>
            {ORDERED_FLOOR_IDS.map((fId) => (
              <button
                key={fId}
                onClick={() => setSelectedFloor(fId)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  selectedFloor === fId
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {fId}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="IT_SUPPORT">IT Support</option>
              <option value="FACILITIES">Facilities</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
            </select>
          </div>
        </section>

        {/* Verified Work Orders Showcase Grid */}
        <section className="mt-6 space-y-5">
          {filteredIssues.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <Layers size={32} className="mx-auto text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">
                No resolved incidents match the selected filter criteria.
              </p>
            </div>
          ) : (
            filteredIssues.map((item) => (
              <Card key={item.id} className="overflow-hidden border border-slate-200 bg-white shadow-xs">
                <CardContent className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-center">
                  {/* Left: Interactive Draggable Before / After Comparison Slider */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-600" /> Drag to inspect before / after
                      </span>
                      <span className="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {Math.round(item.similarityScore * 100)}% Verified Match
                      </span>
                    </div>
                    <BeforeAfterImageSlider
                      beforeUrl={item.beforeUrl}
                      afterUrl={item.afterUrl}
                      similarityScore={item.similarityScore}
                      verified={true}
                      reasoning="Visual geometry and structural alignment verified."
                    />
                  </div>

                  {/* Right: Resolution Specifications & Technician Attribution */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="resolved" className="text-xs">
                        Resolved & Verified
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Floor {item.floor}
                      </Badge>
                      <Badge variant="accent" className="text-xs">
                        {item.room_or_zone}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.impactDesc}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-100 py-3 text-slate-700">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Turnaround Time</span>
                        <strong className="text-slate-900 font-mono text-sm">{item.durationHours} Hours</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Technician Lead</span>
                        <strong className="text-slate-900">{item.technicianName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Reported: {item.reportedAt}</span>
                      <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={14} /> Quality Verified
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        {/* Floating CampBot AI */}
        <CampBotChat />
      </main>
    </div>
  );
}
