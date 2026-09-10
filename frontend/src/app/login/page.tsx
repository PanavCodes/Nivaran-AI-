"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building,
  Wrench,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import {
  homeForRole,
  login,
  quickLoginAs,
  DEMO_ACCOUNTS,
} from "@/lib/auth";
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
    setBusy(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name.split(" ")[0]}!`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickLogin(role: keyof typeof DEMO_ACCOUNTS) {
    setQuickRole(role);
    try {
      const user = await quickLoginAs(role);
      toast.success(`Signed in as ${user.full_name} (${role})`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quick login failed");
    } finally {
      setQuickRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md my-8"
        >
          <Card className="border border-slate-200 bg-white shadow-md rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Access your campus facilities & operations portal
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Layers size={20} />
                </div>
              </div>

              {/* 1-Click Fast-Track Persona Logins for Hackathon Evaluators */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <Sparkles size={13} className="text-indigo-600" />
                    Judge Fast-Track Login
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">1-Click Access</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("ADMIN")}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:border-red-300 transition text-left shadow-2xs cursor-pointer"
                  >
                    <Building size={14} className="text-red-600 shrink-0" />
                    <span className="truncate">{quickRole === "ADMIN" ? "Signing in…" : "Admin"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("TECHNICIAN")}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-amber-50 hover:border-amber-300 transition text-left shadow-2xs cursor-pointer"
                  >
                    <Wrench size={14} className="text-amber-600 shrink-0" />
                    <span className="truncate">{quickRole === "TECHNICIAN" ? "Signing in…" : "Technician"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("STUDENT")}
                    className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:border-indigo-300 transition text-left shadow-2xs cursor-pointer"
                  >
                    <Layers size={14} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{quickRole === "STUDENT" ? "Signing in…" : "Student"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy || !!quickRole}
                    onClick={() => handleQuickLogin("FACULTY")}
                    className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-purple-50 hover:border-purple-300 transition text-left shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck size={14} className="text-purple-600 shrink-0" />
                    <span className="truncate">{quickRole === "FACULTY" ? "Signing in…" : "Faculty"}</span>
                  </button>
                </div>
              </div>

              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-slate-400">
                  or email sign-in
                </span>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nivaran.edu"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-500 hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
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

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Do not have an account?</span>
                <Link
                  href="/register"
                  className="font-semibold text-indigo-600 hover:underline"
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
