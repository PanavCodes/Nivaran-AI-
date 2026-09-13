"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, Clock, ShieldCheck } from "lucide-react";

export function StudentPortalNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (pathname === href) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    router.push(href);
  };

  const tabs = [
    {
      label: "Report an Issue",
      href: "/report",
      icon: AlertCircle,
      badge: "Intake",
      desc: "Blueprint Pinpoint & AI Assist",
    },
    {
      label: "Status Tracker",
      href: "/tracker",
      icon: Clock,
      badge: "Real-Time SLA",
      desc: "Track Reported Issues & Progress",
    },
    {
      label: "Public Audit Wall",
      href: "/transparency",
      icon: ShieldCheck,
      badge: "Verified Proofs",
      desc: "Before/After Resolution Proofs",
    },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 py-2 mb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-[11px]">
            🎓
          </span>
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            Student Portal Workspace
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Switch between filing grievances, tracking SLAs, and verifying public audit proofs
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={(e) => handleTabClick(e, tab.href)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 text-left flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                    {tab.label}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                  {tab.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
