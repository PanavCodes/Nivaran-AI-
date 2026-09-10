"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building,
  Wrench,
  Radar,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
} from "lucide-react";

import {
  homeForRole,
  login,
  quickLoginAs,
  DEMO_ACCOUNTS,
} from "@/lib/auth";
import { sound } from "@/lib/sound";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { CampBotChat } from "@/components/chat/CampBotChat";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    sound.playClick();
    setBusy(true);
    try {
      const user = await login(email, password);
      sound.playSuccess();
      toast.success(`Welcome back, ${user.full_name.split(" ")[0]}!`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickLogin(role: keyof typeof DEMO_ACCOUNTS) {
    sound.playClick();
    setQuickRole(role);
    try {
      const user = await quickLoginAs(role);
      sound.playSuccess();
      toast.success(`Signed in as ${user.full_name} (${role})`, { icon: "⚡" });
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quick login failed");
    } finally {
      setQuickRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />

      <main className="radar-canvas flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        <div className="radar-sweep opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md my-8"
        >
          <Card className="border-[#30363d] bg-[#161b22]/90 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Sign In</h1>
                  <p className="mt-1 text-xs text-[#8b949e]">
                    Access your campus intelligence portal
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30">
                  <Radar size={20} />
                </div>
              </div>

              {/* 1-Click Fast-Track Persona Logins for Hackathon Evaluators */}
              <div className="mt-5 rounded-xl border border-[#30363d] bg-[#0d1117]/80 p-3.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#8b949e] uppercase tracking-wider mb-2.5">
                  <span className="flex items-center gap-1 text-white">
                    <Zap size={13} className="text-amber-400" />
                    Demo Fast-Track Login
                  </span>
                  <span className="text-[10px] text-[#58a6ff]">No Typing</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("ADMIN")}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition text-left"
                  >
                    <Building size={13} className="text-red-400 shrink-0" />
                    <span className="truncate">{quickRole === "ADMIN" ? "Signing in…" : "Admin"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("TECHNICIAN")}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition text-left"
                  >
                    <Wrench size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{quickRole === "TECHNICIAN" ? "Signing in…" : "Technician"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("STUDENT")}
                    className="flex items-center gap-1.5 rounded-lg border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-2.5 py-2 text-xs font-semibold text-[#58a6ff] hover:bg-[#58a6ff]/20 transition text-left"
                  >
                    <Radar size={13} className="text-[#58a6ff] shrink-0" />
                    <span className="truncate">{quickRole === "STUDENT" ? "Signing in…" : "Student"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("FACULTY")}
                    className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition text-left"
                  >
                    <ShieldCheck size={13} className="text-purple-400 shrink-0" />
                    <span className="truncate">{quickRole === "FACULTY" ? "Signing in…" : "Faculty"}</span>
                  </button>
                </div>
              </div>

              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#30363d]" />
                </div>
                <span className="relative bg-[#161b22] px-3 text-[10px] uppercase font-semibold text-[#8b949e]">
                  or email sign-in
                </span>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#8b949e]">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nivaran.edu"
                    className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#58a6ff]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#8b949e]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#58a6ff]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={busy || !!quickRole}
                  className="w-full py-2.5 font-bold"
                >
                  {busy ? "Authenticating…" : "Sign In"}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
                <span>Don&apos;t have an account?</span>
                <Link

                  href="/register"
                  className="font-semibold text-[#58a6ff] hover:underline"
                >
                  Create Account →
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CampBotChat />
    </div>
  );
}
