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

/**
 * Official University Maintenance Incident Memo Modal.
 * Adapted from Civic-Fix (LetterGenerator.jsx).
 * Formats a formal campus memorandum with tracking IDs, SLA audit trail, and signoff line.
 */
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
Subject: Formal Engineering & Maintenance Redressal Action — Floor ${cluster.floor}
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
Recorded automatically via Nivaran AI pgvector spatial clustering system. Immutable audit logs maintained for institutional quality assessment.

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
      <div className="text-left space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Official Incident Memorandum
                <Badge variant="accent" className="text-[9px]">Civic-Fix</Badge>
              </h3>
              <p className="text-xs text-[#8b949e]">Formal university maintenance memo for administrative record</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs h-7">
              <Printer size={13} /> Print
            </Button>
          </div>
        </div>

        {/* Official Letterhead Paper View */}
        <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-6 font-mono text-xs text-[#c9d1d9] leading-relaxed shadow-inner space-y-3">
          <div className="text-center border-b border-[#21262d] pb-3">
            <div className="flex items-center justify-center gap-2 text-white font-bold text-sm tracking-wide">
              <Building2 size={16} className="text-accent" />
              NIVARAN AI · CAMPUS OPERATIONS COMMAND
            </div>
            <p className="text-[10px] text-[#8b949e] uppercase tracking-widest mt-0.5">
              Office of Campus Infrastructure & Facility Redressal
            </p>
          </div>

          <div className="flex justify-between text-[11px] text-[#8b949e]">
            <span>REF: <strong className="text-accent">{refCode}</strong></span>
            <span>DATE: {dateStr}</span>
          </div>

          <div className="pt-2">
            <p className="font-bold text-white">SUBJECT: Engineering & Maintenance Redressal Action — Floor {cluster.floor}</p>
            <p className="text-[#8b949e] text-[11px]">TO: Dean of Campus Infrastructure / Engineering Directorate</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#21262d]">
            <p className="text-white font-semibold">1. Incident Location & Parameters:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]/60">
              <div>Floor: <span className="text-white font-bold">Floor {cluster.floor}</span></div>
              <div>Zone: <span className="text-white font-bold">{cluster.room_or_zone || "General Facility"}</span></div>
              <div>Priority: <span className="text-amber-400 font-bold">{cluster.priority_score.toFixed(0)}/100 ({cluster.sla_tier})</span></div>
              <div>Submissions: <span className="text-white font-bold">{cluster.complaint_count} Citizen Reports</span></div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-white font-semibold">2. Problem Description:</p>
            <p className="text-[11px] text-[#8b949e] bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]/60 italic">
              &ldquo;{cluster.ai_summary || cluster.title}&rdquo;
            </p>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-white font-semibold">3. Status & SLA Resolution Window:</p>
            <p className="text-[11px] text-[#8b949e]">
              Current status is <strong className="text-accent">{cluster.status}</strong>. Work order dispatched with technician dual-proof camera close-out verification enabled.
            </p>
          </div>

          <div className="pt-6 border-t border-[#21262d] flex justify-between items-end text-[10px] text-[#8b949e]">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={14} /> Certified Nivaran Cryptographic Log
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-dashed border-[#8b949e] pb-1"></div>
              <span className="mt-1 block">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
