"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Copy, Check, FileText, Building2, ShieldCheck } from "lucide-react";
import type { ClusterDetail } from "@/lib/types";

interface IncidentMemoModalProps {
  cluster: ClusterDetail | null;
  open: boolean;
  onClose: () => void;
}

export const IncidentMemoModal: React.FC<IncidentMemoModalProps> = ({
  cluster,
  open,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!cluster) return null;

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const refCode = `NIVARAN/2026/FL-${cluster.floor}/${cluster.id.slice(0, 8).toUpperCase()}`;

  const memoText = `MEMORANDUM FOR RECORD
Ref: ${refCode}
Date: ${dateStr}
Subject: Engineering & Maintenance Redressal Action — Floor ${cluster.floor}
To: Office of the Dean of Campus Infrastructure & Facility Services
From: Nivaran AI Operations Command & Control

1. INCIDENT SPECIFICATION:
- Title: ${cluster.title}
- Department: ${cluster.assigned_department}
- Location: 10-Storey Academic Complex, Floor ${cluster.floor} (${cluster.room_or_zone || "Common Facility Zone"})
- Cluster Reference: #${cluster.id}
- Priority Urgency Tier: ${cluster.sla_tier} (Score: ${cluster.priority_score.toFixed(1)}/100)
- Reported Complaints Merged: ${cluster.complaint_count} student/faculty submissions

2. STATUS & ASSIGNMENT:
- Operational Status: ${cluster.status}
- Assigned Technician ID: ${cluster.assigned_technician_id || "Auto-dispatched via Round-Robin"}
- Target Resolution SLA: ${cluster.sla_deadline ? new Date(cluster.sla_deadline).toLocaleString("en-IN") : "Within 24 Hours"}

3. AI DIAGNOSTIC SUMMARY:
${cluster.ai_summary || "Multi-modal structural analysis confirms physical facility damage. Immediate repair authorized under Campusathon Emergency Standards."}

4. COMPLIANCE & AUDIT:
Recorded automatically via Nivaran AI spatial clustering system. Immutable audit logs maintained for institutional assessment.

Approved by: ________________________ (Director of Campus Facilities)
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="text-left space-y-4 max-h-[85vh] overflow-y-auto pr-1 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Official Incident Memorandum
                <Badge variant="accent" className="text-[10px] py-0">Civic-Fix</Badge>
              </h3>
              <p className="text-xs text-slate-500">Formal campus facility memo for administrative documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-8">
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy Text"}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs h-8">
              <Printer size={13} /> Print
            </Button>
          </div>
        </div>

        {/* Official Letterhead Paper View */}
        <div className="rounded-xl border border-slate-300/80 bg-[#fdfdfd] p-6 font-mono text-xs text-slate-800 leading-relaxed shadow-sm space-y-3">
          <div className="text-center border-b border-slate-200 pb-3">
            <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-sm tracking-wide font-sans">
              <Building2 size={16} className="text-indigo-600" />
              NIVARAN AI · CAMPUS OPERATIONS COMMAND
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              Office of Campus Infrastructure & Facility Redressal
            </p>
          </div>

          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>REF: <strong className="text-indigo-700 font-bold">{refCode}</strong></span>
            <span>DATE: {dateStr}</span>
          </div>

          <div className="pt-2">
            <p className="font-bold text-slate-900">SUBJECT: Engineering & Maintenance Redressal Action — Floor {cluster.floor}</p>
            <p className="text-slate-500 text-xs mt-0.5">TO: Dean of Campus Infrastructure / Engineering Directorate</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <p className="text-slate-900 font-bold">1. Incident Location & Parameters:</p>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>Floor: <span className="text-slate-900 font-bold">Floor {cluster.floor}</span></div>
              <div>Zone: <span className="text-slate-900 font-bold">{cluster.room_or_zone || "General Facility"}</span></div>
              <div>Priority: <span className="text-amber-800 font-bold">{cluster.priority_score.toFixed(0)}/100 ({cluster.sla_tier})</span></div>
              <div>Submissions: <span className="text-slate-900 font-bold">{cluster.complaint_count} Consolidated Reports</span></div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-slate-900 font-bold">2. Problem Description:</p>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 italic">
              &ldquo;{cluster.ai_summary || cluster.title}&rdquo;
            </p>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-slate-900 font-bold">3. Status & SLA Resolution Window:</p>
            <p className="text-xs text-slate-600">
              Current status is <strong className="text-indigo-700 font-bold">{cluster.status}</strong>. Work order dispatched with technician dual-proof camera close-out verification enabled.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" /> Certified System Audit Record
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-dashed border-slate-400 pb-1"></div>
              <span className="mt-1 block text-[10px]">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
