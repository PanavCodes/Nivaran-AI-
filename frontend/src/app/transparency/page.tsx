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
import { sound } from "@/lib/sound";
import { BeforeAfterImageSlider } from "@/components/technician/BeforeAfterImageSlider";
import { ORDERED_FLOOR_IDS } from "@/lib/campus_floors";
import { CampBotChat } from "@/components/chat/CampBotChat";

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

// Sample verified resolved showcase items adapted from smart-civic-issue-reporter
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
  { dept: "IT Infrastructure", resolved: 22, onTimeRate: "100%", avgHours: "2.4h", color: "text-blue-400" },
  { dept: "HVAC & Plumbing", resolved: 18, onTimeRate: "97.5%", avgHours: "4.2h", color: "text-amber-400" },
  { dept: "Electrical & Power", resolved: 14, onTimeRate: "98.1%", avgHours: "3.1h", color: "text-yellow-400" },
  { dept: "Structural & Glass", resolved: 11, onTimeRate: "95.0%", avgHours: "5.8h", color: "text-emerald-400" },
];

export default function PublicTransparencyPage() {
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [issues] = useState<ResolvedIssueItem[]>(SAMPLE_RESOLVED);

  const filteredIssues = issues.filter((item) => {
    if (selectedFloor !== "ALL" && item.floor !== selectedFloor) return false;
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />

      <main className="flex-1 p-4 md:p-8 text-[#c9d1d9] max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#30363d] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={13} /> Public Audit & Redressal Wall
              </span>
              <span className="text-xs text-[#8b949e]">·</span>
              <Badge variant="accent" className="text-[10px]">
                Dual-Proof Verified
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
              Campus Transparency & Proof-of-Work
              <CheckCircle2 size={24} className="text-emerald-400" />
            </h1>
            <p className="mt-1 text-xs md:text-sm text-[#8b949e]">
              Public record showcasing dual-camera verified repairs, before/after structural similarity, and institutional SLAs across all 10 floors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/report" onClick={() => sound.playClick()}>
              <Button size="sm">
                Report an Issue
              </Button>
            </Link>
            <Link href="/admin" onClick={() => sound.playClick()}>
              <Button variant="outline" size="sm">
                Mission Control
              </Button>
            </Link>
          </div>
        </div>


      {/* KPI Stats Header Bar */}
      <section className="mx-auto max-w-6xl mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-400" /> Resolved This Month
          </span>
          <div className="mt-1 text-2xl font-black text-white">48 Issues</div>
          <span className="text-[11px] text-emerald-400">100% Dual-Proof Verified</span>
        </div>

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider flex items-center gap-1">
            <Clock size={13} className="text-cyan-400" /> Mean Redressal Time
          </span>
          <div className="mt-1 text-2xl font-black text-white">4.8 Hours</div>
          <span className="text-[11px] text-[#8b949e]">Well within SLA targets</span>
        </div>

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider flex items-center gap-1">
            <Sparkles size={13} className="text-amber-400" /> AI Visual Match
          </span>
          <div className="mt-1 text-2xl font-black text-white">93.8%</div>
          <span className="text-[11px] text-[#8b949e]">Structural similarity avg</span>
        </div>

        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <span className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider flex items-center gap-1">
            <Award size={13} className="text-purple-400" /> Active Tech Force
          </span>
          <div className="mt-1 text-2xl font-black text-white">12 Field Staff</div>
          <span className="text-[11px] text-[#8b949e]">Round-the-clock coverage</span>
        </div>
      </section>

      {/* Department Performance SLA Leaderboard */}
      <section className="mx-auto max-w-6xl mt-4 rounded-xl border border-[#30363d] bg-[#161b22]/50 p-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-2 mb-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Award size={14} className="text-amber-400" />
            Institutional Department SLA Redressal Leaderboard
          </span>
          <span className="text-[10px] text-[#8b949e]">Rolling 30-Day Audit</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {DEPARTMENT_LEADERBOARD.map((d) => (
            <div key={d.dept} className="rounded-lg border border-[#21262d] bg-[#0d1117] p-3">
              <div className="text-xs font-semibold text-white">{d.dept}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-lg font-black ${d.color}`}>{d.onTimeRate}</span>
                <span className="text-[11px] text-[#8b949e] font-mono">{d.avgHours} avg</span>
              </div>
              <div className="mt-1 text-[10px] text-[#8b949e]">{d.resolved} verified resolutions</div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Controls */}
      <section className="mx-auto max-w-6xl mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#21262d] bg-[#161b22]/70 p-3">

        {/* Floor Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-xs text-[#8b949e] mr-1 flex items-center gap-1">
            <Building size={13} /> Floor:
          </span>
          <button
            onClick={() => setSelectedFloor("ALL")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
              selectedFloor === "ALL"
                ? "bg-accent text-[#0d1117]"
                : "border border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:text-white"
            }`}
          >
            All Floors
          </button>
          {ORDERED_FLOOR_IDS.map((fId) => (
            <button
              key={fId}
              onClick={() => setSelectedFloor(fId)}
              className={`rounded px-2 py-1 text-xs font-semibold transition ${
                selectedFloor === fId
                  ? "bg-accent text-[#0d1117]"
                  : "border border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:text-white"
              }`}
            >
              Floor {fId}
            </button>
          ))}
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#8b949e]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-xs text-white outline-none"
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
      <section className="mx-auto max-w-6xl mt-6 space-y-6">
        {filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-12 text-center">
            <Layers size={32} className="mx-auto text-[#8b949e]/50" />
            <p className="mt-3 text-sm text-[#8b949e]">
              No resolved reports match the selected filters.
            </p>
          </div>
        ) : (
          filteredIssues.map((item) => (
            <Card key={item.id} className="overflow-hidden border border-[#30363d] bg-[#161b22]">
              <CardContent className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-center">
                {/* Left: Interactive Draggable Before / After Comparison Slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles size={12} className="text-accent" /> Drag Divider to Compare Scene
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {Math.round(item.similarityScore * 100)}% Match
                    </span>
                  </div>
                  <BeforeAfterImageSlider
                    beforeUrl={item.beforeUrl}
                    afterUrl={item.afterUrl}
                    similarityScore={item.similarityScore}
                    verified={true}
                    reasoning="Visual geometry and fixture alignment confirmed by Gemini Vision."
                  />
                </div>

                {/* Right: Resolution Specifications & Technician Attribution */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="resolved" className="text-xs">
                      Resolved & Closed
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Floor {item.floor}
                    </Badge>
                    <Badge variant="accent" className="text-xs">
                      {item.room_or_zone}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#8b949e] leading-relaxed">
                    {item.impactDesc}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-[#21262d] py-3 text-[#c9d1d9]">
                    <div>
                      <span className="text-[#8b949e] block text-[10px] uppercase">Resolution Time</span>
                      <strong className="text-white font-mono">{item.durationHours} Hours</strong>
                    </div>
                    <div>
                      <span className="text-[#8b949e] block text-[10px] uppercase">Service Lead</span>
                      <strong className="text-white">{item.technicianName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                    <span>Reported: {item.reportedAt}</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 size={13} /> Institutional Quality Seal
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

