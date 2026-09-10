"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  LayoutDashboard,
  Wrench,
  ClipboardList,
  CheckCircle2,
  Volume2,
  VolumeX,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Sparkles,
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
  { label: "Intake", href: "/report", icon: Layers },
  { label: "Mission Control", href: "/admin", icon: LayoutDashboard },
  { label: "Technician Queue", href: "/technician", icon: Wrench },
  { label: "Status Tracker", href: "/tracker", icon: ClipboardList },
  { label: "Transparency", href: "/transparency", icon: CheckCircle2, badge: "Verified" },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isMuted, setIsMuted] = useState(true);
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
      toast.info("Audio enabled", { duration: 1500 });
    } else {
      toast.info("Audio muted", { duration: 1500 });
    }
  };

  const handleQuickSwitch = async (role: "ADMIN" | "TECHNICIAN" | "STUDENT" | "FACULTY") => {
    setSwitching(true);
    try {
      const u = await quickLoginAs(role);
      setUser(u);
      setPersonaMenuOpen(false);
      toast.success(`Switched role to ${u.full_name} (${role})`);
      if (role === "ADMIN" || role === "FACULTY") {
        router.push("/admin");
      } else if (role === "TECHNICIAN") {
        router.push("/technician");
      } else {
        router.push("/report");
      }
    } catch {
      toast.error("Failed to switch role");
    } finally {
      setSwitching(false);
    }
  };

  const roleBadgeVariant: Record<Role, "emergency" | "high" | "accent" | "default"> = {
    ADMIN: "emergency",
    TECHNICIAN: "high",
    STUDENT: "accent",
    FACULTY: "default",
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Layers size={17} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                  Nivaran AI
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 border border-slate-200 hidden sm:inline-block">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block">
                Campus Operations Intelligence
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
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "text-slate-900 bg-slate-100 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} className={active ? "text-indigo-600" : "text-slate-500"} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200/60">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-2.5 right-2.5 h-0.5 rounded-full bg-indigo-600"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: System Indicator + Sound + Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Steady Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>10-Floor Engine Online</span>
          </div>

          {/* Optional Audio Toggle */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-indigo-600" />}
          </button>

          {/* User Persona & Role Switcher */}
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 hover:border-slate-300 transition shadow-2xs font-medium cursor-pointer"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                  {user.full_name.charAt(0)}
                </div>
                <span className="max-w-[90px] sm:max-w-[120px] truncate">
                  {user.full_name.split(" ")[0]}
                </span>
                <Badge variant={roleBadgeVariant[user.role]} className="text-[9px] py-0 px-1.5">
                  {user.role}
                </Badge>
                <ChevronDown size={13} className="text-slate-400" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 transition cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Demo Switcher</span>
                  <ChevronDown size={12} />
                </button>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Dropdown Menu for 1-Click Role / Persona Switching */}
            <AnimatePresence>
              {personaMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50"
                >
                  <div className="px-2.5 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                        Role Switcher
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">Judge Fast-Track</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Instantly test different portal permissions.
                    </p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("ADMIN")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Administrator</p>
                        <p className="text-[10px] text-slate-500">Mission Control & Dispatch</p>
                      </div>
                      <Badge variant="emergency" className="text-[9px] py-0 px-1">Admin</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("TECHNICIAN")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Technician</p>
                        <p className="text-[10px] text-slate-500">Queue & Photo Closeout</p>
                      </div>
                      <Badge variant="high" className="text-[9px] py-0 px-1">Tech</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("STUDENT")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Student</p>
                        <p className="text-[10px] text-slate-500">Intake & Blueprint Pinpoint</p>
                      </div>
                      <Badge variant="accent" className="text-[9px] py-0 px-1">Student</Badge>
                    </button>

                    <button
                      disabled={switching}
                      onClick={() => handleQuickSwitch("FACULTY")}
                      className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Faculty Member</p>
                        <p className="text-[10px] text-slate-500">Department Overview</p>
                      </div>
                      <Badge variant="default" className="text-[9px] py-0 px-1">Faculty</Badge>
                    </button>
                  </div>

                  {user && (
                    <div className="mt-1 pt-1 border-t border-slate-100">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 transition cursor-pointer"
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
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs"
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
            className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1.5 shadow-sm"
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={active ? "text-indigo-600" : "text-slate-500"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
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
