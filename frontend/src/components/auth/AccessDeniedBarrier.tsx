"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight, Home, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";

interface AccessDeniedBarrierProps {
  portalName: string;
  allowedRoles: string[];
  userRole?: string;
  homePath: string;
  homeLabel: string;
  customMessage?: string;
}

export const AccessDeniedBarrier: React.FC<AccessDeniedBarrierProps> = ({
  portalName,
  allowedRoles,
  userRole,
  homePath,
  homeLabel,
  customMessage,
}) => {
  const handleSignOut = () => {
    logout();
    window.location.href = "/login";
  };

  const formattedRole = userRole
    ? userRole.charAt(0) + userRole.slice(1).toLowerCase()
    : "Guest";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-lg">
        {/* Shield Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 mb-4">
          <ShieldAlert size={28} />
        </div>

        <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Restricted Portal
        </span>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-3">
          {portalName} Access Restricted
        </h2>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
          {customMessage ||
            `You are currently signed in as a ${formattedRole}. This workspace is reserved for ${allowedRoles.join(" & ")} accounts.`}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <Link
            href={homePath}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Home size={14} />
            <span>{homeLabel}</span>
            <ArrowRight size={14} />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogOut size={13} />
            <span>Switch Role or Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
