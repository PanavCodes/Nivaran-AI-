"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  Building,
  Wrench,
  ClipboardList,
  CheckCircle2,
  Volume2,
  VolumeX,
  User,
  ChevronDown,
  LogOut,
  Sparkles,
  Menu,
  X,
  Zap,
} from "lucide-react";
import {
  getStoredUser,
  logout,
  quickLoginAs,
  type SessionUser,
  type Role,
} from "@/lib/auth";
import { sound } from "@/lib/sound";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Radar Intake", href: "/report", icon: Radar },
  { label: "Mission Control", href: "/admin", icon: Building },
  { label: "Task Force", href: "/technician", icon: Wrench },
  { label: "My Tracker", href: "/tracker", icon: ClipboardList },
  { label: "Transparency", href: "/transparency", icon: CheckCircle2, badge: "Proof" },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getStoredUser());
    setIsMuted(sound.isMuted());

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPersonaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
    if (!next) {
      sound.playClick();
      toast.success("Cybernetic audio enabled", { duration: 1500 });
    } else {
      toast.info("Audio muted", { duration: 1500 });
    }
  };

  const handleQuickSwitch = async (role: "ADMIN" | "TECHNICIAN" | "STUDENT" | "FACULTY") => {
    setSwitching(true);
    sound.playClick();
    try {
      const u = await quickLoginAs(role);
      setUser(u);
      setPersonaMenuOpen(false);
      toast.success(`Switched persona to ${u.full_name} (${role})!`, { icon: "⚡" });
      if (role === "ADMIN" || role === "FACULTY") {
        router.push("/admin");
      } else if (role === "TECHNICIAN") {
        router.push("/technician");
      } else {
        router.push("/report");
      }
    } catch {
      toast.error("Failed to switch persona");
    } finally {
      setSwitching(false);
    }
  };

  const roleColor: Record<Role, string> = {
    ADMIN: "bg-red-500/15 text-red-400 border-red-500/30",
    TECHNICIAN: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    STUDENT: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    FACULTY: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#30363d]/80 bg-[#0d1117]/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="group flex items-center gap-2.5"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] shadow-lg shadow-[#58a6ff]/20">
              <Radar size={18} className="text-[#0d1117] transition group-hover:rotate-45 duration-300" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white group-hover:text-[#58a6ff] transition">
                  Nivaran AI
                </span>
                <span className="rounded bg-[#58a6ff]/10 px-1 py-0.2 text-[9px] font-mono uppercase text-[#58a6ff] border border-[#58a6ff]/25 hidden sm:inline-block">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-[#8b949e] -mt-0.5 hidden sm:block">
                Campus Problem Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => sound.playClick()}
                  className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "text-white bg-[#21262d]/80 shadow-sm"
                      : "text-[#8b949e] hover:text-white hover:bg-[#161b22]"
                  }`}
                >
                  <Icon size={14} className={active ? "text-[#58a6ff]" : "text-[#8b949e]"} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#58a6ff]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Engine Status + Audio Toggle + User/Persona Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Engine Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono">10-Floor Engine Live</span>
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? "Unmute Cyber Audio" : "Mute Audio"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#30363d] bg-[#161b22] text-[#8b949e] hover:text-white hover:border-[#58a6ff]/40 transition"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-[#58a6ff]" />}
          </button>

          {/* User Persona & Role Switcher */}
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-[#30363d] bg-[#161b22] px-2.5 py-1.5 text-xs text-white hover:border-[#58a6ff]/50 transition"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#58a6ff]/20 text-[#58a6ff]">
                  <User size={12} />
                </div>
                <span className="max-w-[90px] sm:max-w-[120px] truncate font-medium">
                  {user.full_name.split(" ")[0]}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.2 text-[10px] font-mono uppercase ${
                    roleColor[user.role] || "bg-gray-800 text-gray-300"
                  }`}
                >
                  {user.role}
                </span>
                <ChevronDown size={13} className="text-[#8b949e]" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#58a6ff]/40 bg-[#58a6ff]/10 px-2.5 py-1.5 text-xs font-semibold text-[#58a6ff] hover:bg-[#58a6ff]/20 transition"
                >
                  <Zap size={13} />
                  <span>Demo Switcher</span>
                  <ChevronDown size={12} />
                </button>
                <Link
                  href="/login"
                  onClick={() => sound.playClick()}
                  className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#161b22] transition"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Dropdown Menu for 1-Click Role / Persona Switching */}
            <AnimatePresence>
              {personaMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-[#30363d] bg-[#161b22] p-2 shadow-2xl backdrop-blur-xl z-50"
                >
                  <div className="px-2.5 py-2 border-b border-[#30363d]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={12} className="text-[#58a6ff]" /> Quick Role Persona
                      </span>
                      <span className="text-[9px] text-[#8b949e]">Judge Fast-Track</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8b949e]">
                      Switch user roles instantly with seed data.
                    </p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("ADMIN")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-white hover:bg-[#21262d] transition"
                    >
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-red-400" />
                        <div>
                          <p className="font-medium">Administrator</p>
                          <p className="text-[10px] text-[#8b949e]">Mission Control / Dispatch</p>
                        </div>
                      </div>
                      <Badge variant="emergency" className="text-[9px] py-0 px-1">Admin</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("TECHNICIAN")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-white hover:bg-[#21262d] transition"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-amber-400" />
                        <div>
                          <p className="font-medium">Technician</p>
                          <p className="text-[10px] text-[#8b949e]">Task Force / Dual-Proof</p>
                        </div>
                      </div>
                      <Badge variant="high" className="text-[9px] py-0 px-1">Tech</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("STUDENT")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-white hover:bg-[#21262d] transition"
                    >
                      <div className="flex items-center gap-2">
                        <Radar size={14} className="text-[#58a6ff]" />
                        <div>
                          <p className="font-medium">Student</p>
                          <p className="text-[10px] text-[#8b949e]">Radar Intake / Pinpoint</p>
                        </div>
                      </div>
                      <Badge variant="accent" className="text-[9px] py-0 px-1">Student</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("FACULTY")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-white hover:bg-[#21262d] transition"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-purple-400" />
                        <div>
                          <p className="font-medium">Faculty Member</p>
                          <p className="text-[10px] text-[#8b949e]">Department Grievances</p>
                        </div>
                      </div>
                      <span className="rounded bg-purple-500/20 px-1 text-[9px] text-purple-300 font-mono">Faculty</span>
                    </button>
                  </div>

                  {user && (
                    <div className="mt-1 pt-1 border-t border-[#30363d]">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                      >
                        <LogOut size={13} />
                        <span>Sign Out ({user.email})</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[#30363d] bg-[#161b22] text-[#8b949e]"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[#30363d] bg-[#0d1117] px-4 py-3 space-y-1.5"
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    sound.playClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                    active ? "bg-[#21262d] text-white" : "text-[#8b949e] hover:bg-[#161b22] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={active ? "text-[#58a6ff]" : "text-[#8b949e]"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
