"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Wrench,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  X,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { quickLoginAs, login, homeForRole, DEMO_ACCOUNTS } from "@/lib/auth";
import { toast } from "sonner";

interface RoleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: "STUDENT" | "TECHNICIAN" | "ADMIN";
}

export const RoleLoginModal: React.FC<RoleLoginModalProps> = ({
  isOpen,
  onClose,
  defaultRole,
}) => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TECHNICIAN" | "ADMIN">(
    defaultRole || "STUDENT"
  );
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const handle1ClickDemo = async (role: "STUDENT" | "TECHNICIAN" | "ADMIN") => {
    setLoadingRole(role);
    try {
      const user = await quickLoginAs(role);
      toast.success(`Authenticated as ${user.full_name} (${role})`);
      onClose();
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo sign in failed");
    } finally {
      setLoadingRole(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRole("custom");
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.full_name}!`);
      onClose();
      router.push(homeForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoadingRole(null);
    }
  };

  const roleConfigs = [
    {
      role: "STUDENT" as const,
      title: "Student",
      badge: "Intake & Tracking",
      icon: GraduationCap,
      accentColor: "indigo",
      bgGradient: "from-indigo-50/70 to-white",
      borderColor: "border-indigo-200",
      activeBorder: "border-indigo-600 ring-2 ring-indigo-500/20",
      buttonBg: "bg-indigo-600 hover:bg-indigo-700 text-white",
      demoAccount: DEMO_ACCOUNTS.STUDENT,
      desc: "Report campus problems with multi-modal AI, voice intake, QR scanner, and track repair SLAs.",
      features: ["Drag-and-Drop Photo AI", "Door QR Code Lock-on", "SLA Resolution Countdown"],
    },
    {
      role: "TECHNICIAN" as const,
      title: "Field Technician",
      badge: "Work Orders",
      icon: Wrench,
      accentColor: "amber",
      bgGradient: "from-amber-50/70 to-white",
      borderColor: "border-amber-200",
      activeBorder: "border-amber-600 ring-2 ring-amber-500/20",
      buttonBg: "bg-amber-600 hover:bg-amber-700 text-white",
      demoAccount: DEMO_ACCOUNTS.TECHNICIAN,
      desc: "Receive assigned work orders sorted by urgency, review CMMS tool lists, and verify repairs.",
      features: ["Mobile Urgency Queue", "CMMS Parts & Tooling", "Dual-Proof Photo Verification"],
    },
    {
      role: "ADMIN" as const,
      title: "Administrator",
      badge: "Mission Control",
      icon: ShieldCheck,
      accentColor: "red",
      bgGradient: "from-red-50/70 to-white",
      borderColor: "border-red-200",
      activeBorder: "border-red-600 ring-2 ring-red-500/20",
      buttonBg: "bg-slate-900 hover:bg-slate-800 text-white",
      demoAccount: DEMO_ACCOUNTS.ADMIN,
      desc: "Command center for 10-floor operations: interactive blueprints, Facility Health Index, and incident memos.",
      features: ["10-Floor Tactical Blueprints", "Automated Cluster Merging", "Official Incident Memos"],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">
                N
              </span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Select Your Campus Portal
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Choose your role to launch the dedicated portal, or test with 1-click demo access.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!isCustomMode ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roleConfigs.map((cfg) => {
                  const Icon = cfg.icon;
                  const isSelected = selectedRole === cfg.role;
                  const isDemoLoading = loadingRole === cfg.role;

                  return (
                    <div
                      key={cfg.role}
                      onClick={() => setSelectedRole(cfg.role)}
                      className={`relative flex flex-col justify-between rounded-xl border p-4.5 transition cursor-pointer ${
                        isSelected
                          ? `${cfg.activeBorder} shadow-sm bg-gradient-to-b ${cfg.bgGradient}`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              cfg.role === "STUDENT"
                                ? "bg-indigo-100 text-indigo-700"
                                : cfg.role === "TECHNICIAN"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              cfg.role === "STUDENT"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : cfg.role === "TECHNICIAN"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {cfg.badge}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">{cfg.title}</h3>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed min-h-[48px]">
                          {cfg.desc}
                        </p>

                        {/* Micro features */}
                        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5">
                          {cfg.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 1-Click Demo Login Button for this specific role */}
                      <div className="mt-5 space-y-2">
                        <button
                          type="button"
                          disabled={!!loadingRole}
                          onClick={(e) => {
                            e.stopPropagation();
                            handle1ClickDemo(cfg.role);
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold transition shadow-xs cursor-pointer ${cfg.buttonBg}`}
                        >
                          <Sparkles size={13} className="shrink-0" />
                          <span>{isDemoLoading ? "Authenticating…" : `1-Click ${cfg.title.split(" ")[0]} Demo`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole(cfg.role);
                            setEmail(cfg.demoAccount.email);
                            setPassword(cfg.demoAccount.password);
                            setIsCustomMode(true);
                          }}
                          className="w-full text-center text-[11px] font-medium text-slate-500 hover:text-slate-800 transition py-1"
                        >
                          Sign in with credentials →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Evaluator Bar */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span className="font-semibold">Hackathon Judge Evaluator Quick-Access:</span>
                  <span className="text-slate-500">Instant role switching without passwords.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handle1ClickDemo("STUDENT")}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-indigo-700 font-bold hover:bg-indigo-50 transition cursor-pointer"
                  >
                    🎓 Student
                  </button>
                  <button
                    onClick={() => handle1ClickDemo("TECHNICIAN")}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-amber-700 font-bold hover:bg-amber-50 transition cursor-pointer"
                  >
                    🔧 Tech
                  </button>
                  <button
                    onClick={() => handle1ClickDemo("ADMIN")}
                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-red-700 font-bold hover:bg-red-50 transition cursor-pointer"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Custom Credentials Form */
            <div className="max-w-md mx-auto py-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Sign in as {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  ← Back to role selection
                </button>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@nivaran.edu"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!!loadingRole}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{loadingRole === "custom" ? "Signing In…" : "Sign In with Credentials"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
