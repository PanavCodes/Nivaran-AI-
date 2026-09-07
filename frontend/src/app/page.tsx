"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radar, ShieldCheck, Zap, ArrowRight, Map, Wrench } from "lucide-react";
import { getStoredUser, homeForRole, type SessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const features = [
    {
      icon: Radar,
      title: "Radar Intake",
      body: "Drag-and-drop a photo — Gemini reads the scene, pre-fills category & severity, and matches you against nearby reports in real time.",
    },
    {
      icon: Map,
      title: "Mission Control",
      body: "Every duplicate collapses into one prioritized cluster on a live geofenced map. Watch priority climb as reports pile in — no refresh needed.",
    },
    {
      icon: Wrench,
      title: "Task Force Terminal",
      body: "Technicians get SLA-sorted queues, live countdowns, and dual-proof photo verification before any issue is sealed resolved.",
    },
  ];

  return (
    <main className="radar-canvas flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="radar-sweep opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center"
      >
        <Badge variant="accent" className="mb-4">
          <Zap size={12} className="mr-1" /> Campusathon 2026 · PS5 Campus Problem Intelligence
        </Badge>
        <h1 className="bg-gradient-to-b from-white to-[#8b949e] bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
          Nivaran AI
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#8b949e]">
          Every report contributes to a campus-wide intelligence layer — turning scattered
          complaints into actionable, prioritized, transparent resolution.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              href={homeForRole(user.role)}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-[#0d1117] transition hover:bg-accent/85"
            >
              Open {user.role === "TECHNICIAN" ? "Task Force Terminal" : user.role === "STUDENT" ? "Radar Intake" : "Mission Control"}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-[#0d1117] transition hover:bg-accent/85"
              >
                Sign In <ArrowRight size={16} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-6 py-3 text-[#c9d1d9] transition hover:border-accent/60 hover:text-accent"
              >
                Create Account
              </Link>
            </>
          )}
        </div>

        <div className="mt-14 grid w-full gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.12 }}
            >
              <Card className="h-full text-left">
                <CardContent className="p-5">
                  <f.icon className="mb-3 text-accent" size={22} />
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#8b949e]">{f.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs text-[#8b949e]">
          <ShieldCheck size={14} className="text-resolved" />
          Immutable audit trail · SLA-breach escalation · Dual-proof verification
        </div>
      </motion.div>
    </main>
  );
}
