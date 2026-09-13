"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import {
  getStoredUser,
  logout,
  quickLoginAs,
  type SessionUser,
  type Role,
} from "@/lib/auth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getStoredUser());

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPersonaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickSwitch = async (role: "ADMIN" | "TECHNICIAN" | "STUDENT") => {
    setSwitching(true);
    try {
      const u = await quickLoginAs(role);
      setUser(u);
      setPersonaMenuOpen(false);
      toast.success(`Switched role to ${u.full_name} (${role})`);
      if (role === "ADMIN") {
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

  const currentNavItems: NavItem[] = React.useMemo(() => {
    if (!user) {
      return [
        { label: "Home", href: "/" },
        { label: "Report an Issue", href: "/report" },
        { label: "Status Tracker", href: "/tracker" },
        { label: "Public Audit", href: "/transparency" },
      ];
    }
    switch (user.role) {
      case "STUDENT":
        return [
          { label: "Report an Issue", href: "/report" },
          { label: "Status Tracker", href: "/tracker" },
          { label: "Public Audit", href: "/transparency" },
        ];
      case "TECHNICIAN":
        return [
          { label: "Work Orders", href: "/technician" },
          { label: "Public Audit", href: "/transparency" },
        ];
      case "ADMIN":
      default:
        return [
          { label: "Dispatch Console", href: "/admin" },
          { label: "Report an Issue", href: "/report" },
          { label: "Status Tracker", href: "/tracker" },
          { label: "Public Audit", href: "/transparency" },
        ];
    }
  }, [user]);

  const roleBadgeVariant: Record<Role, "emergency" | "high" | "accent"> = {
    ADMIN: "emergency",
    TECHNICIAN: "high",
    STUDENT: "accent",
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white font-bold text-xs">
              N
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                Nivaran
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Dynamic Role-Based */}
          <nav className="hidden md:flex items-center gap-1">
            {currentNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    if (pathname === item.href) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    router.push(item.href);
                  }}
                  className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    active
                      ? "text-slate-900 bg-slate-100 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-slate-900" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Role Switcher & Evaluation Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 hover:border-slate-300 transition shadow-2xs font-medium cursor-pointer"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
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
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>Role switch</span>
                  <ChevronDown size={12} />
                </button>
                <Link
                  href="/login"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
                >
                  Sign in
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
            {currentNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    if (pathname === item.href) {
                      e.preventDefault();
                      return;
                    }
                    e.preventDefault();
                    router.push(item.href);
                  }}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium cursor-pointer ${
                    active ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
