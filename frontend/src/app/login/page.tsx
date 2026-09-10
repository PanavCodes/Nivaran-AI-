"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Wrench,
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
} from "lucide-react";

import {
  homeForRole,
  login,
  register,
  quickLoginAs,
  type Role,
  DEMO_ACCOUNTS,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { CampBotChat } from "@/components/chat/CampBotChat";

export default function LoginPage() {
  const router = useRouter();

  // Mode: "signin" or "register"
  const [mode, setMode] = useState<"signin" | "register">("signin");

  // Sign in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("STUDENT");
  const [regDept, setRegDept] = useState("CSE");

  const [busy, setBusy] = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await register({
        full_name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        department: regDept,
      });
      toast.success(`Account created! Welcome, ${user.full_name}.`);
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
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
      toast.error(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setQuickRole(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg my-6"
        >
          <Card className="border border-slate-200/90 bg-white shadow-lg rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 pt-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
                      N
                    </span>
                    <span className="text-sm font-bold tracking-tight text-slate-900">
                      Nivaran.ai
                    </span>
                  </div>
                  <h1 className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
                    {mode === "signin" ? "Sign in to your account" : "Create a new account"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Campus Facilities & Infrastructure Redressal Platform
                  </p>
                </div>

                <div className="rounded-full bg-indigo-50 border border-indigo-200/80 p-2 text-indigo-600">
                  <ShieldCheck size={22} />
                </div>
              </div>

              {/* Mode Toggle Tabs (Sign In / Register) */}
              <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100/90 p-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition cursor-pointer ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserPlus size={14} />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Form Section */}
              <AnimatePresence mode="wait">
                {mode === "signin" ? (
                  <motion.form
                    key="signin-form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={onSignIn}
                    className="space-y-4"
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student1@nivaran.edu"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
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
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={busy || !!quickRole}
                      className="w-full py-2.5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {busy ? "Authenticating…" : "Sign In to Portal →"}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register-form"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={onRegister}
                    className="space-y-3.5"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ananya Verma"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Institutional Email
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="ananya.v@nivaran.edu"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Select Role
                        </label>
                        <select
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as Role)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                        >
                          <option value="STUDENT">Student</option>
                          <option value="TECHNICIAN">Maintenance Crew</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Department / Wing
                      </label>
                      <input
                        type="text"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        placeholder="e.g. CSE, Mechanical, Facilities, Electrical"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-2xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={busy || !!quickRole}
                      className="w-full py-2.5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {busy ? "Registering…" : "Create Account & Enter Portal →"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Prominent Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ⚡ Demo Login (1-Click Instant Access)
                </span>
              </div>

              {/* ── Demo Login Buttons: For User Student, Maintenance Crew & Admin ── */}
              <div className="space-y-2.5">
                {/* 1. Student Demo Button */}
                <button
                  type="button"
                  disabled={busy || !!quickRole}
                  onClick={() => handleQuickLogin("STUDENT")}
                  className="w-full flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-left hover:bg-indigo-50 hover:border-indigo-400 transition shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-indigo-200 text-indigo-600 shadow-2xs group-hover:scale-105 transition">
                      <GraduationCap size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Student Demo
                        </span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                          Student Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        student1@nivaran.edu · Report Intake & Status Tracker
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 group-hover:translate-x-0.5 transition shrink-0 pl-2">
                    <span>{quickRole === "STUDENT" ? "Entering…" : "Enter"}</span>
                    <ArrowRight size={14} />
                  </div>
                </button>

                {/* 2. Maintenance Crew Demo Button */}
                <button
                  type="button"
                  disabled={busy || !!quickRole}
                  onClick={() => handleQuickLogin("TECHNICIAN")}
                  className="w-full flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-left hover:bg-amber-50 hover:border-amber-400 transition shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-amber-200 text-amber-600 shadow-2xs group-hover:scale-105 transition">
                      <Wrench size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Maintenance Crew Demo
                        </span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                          Technician Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        tech.maintenance@nivaran.edu · Task Force & Photo Closeout
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition shrink-0 pl-2">
                    <span>{quickRole === "TECHNICIAN" ? "Entering…" : "Enter"}</span>
                    <ArrowRight size={14} />
                  </div>
                </button>

                {/* 3. Administrator Demo Button */}
                <button
                  type="button"
                  disabled={busy || !!quickRole}
                  onClick={() => handleQuickLogin("ADMIN")}
                  className="w-full flex items-center justify-between rounded-xl border border-red-200 bg-red-50/40 p-3 text-left hover:bg-red-50 hover:border-red-400 transition shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-red-200 text-red-600 shadow-2xs group-hover:scale-105 transition">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Administrator Demo
                        </span>
                        <span className="rounded bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-800">
                          Admin Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        admin@nivaran.edu · Mission Control & Multi-Floor Dispatch
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-red-800 group-hover:translate-x-0.5 transition shrink-0 pl-2">
                    <span>{quickRole === "ADMIN" ? "Entering…" : "Enter"}</span>
                    <ArrowRight size={14} />
                  </div>
                </button>
              </div>

              {/* Bottom Security Guarantee Notice */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Strict role-based isolation enforced. Portals do not overlap.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CampBotChat />
    </div>
  );
}
