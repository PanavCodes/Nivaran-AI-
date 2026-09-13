"use client";

import type { Cluster, ClusterDetail, Complaint, WorkOrderChecklist, SubmissionResult } from "./types";

const SHARED_CLUSTERS_KEY = "nivaran_shared_clusters";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getWorkOrderChecklist(category: string, _title?: string): WorkOrderChecklist {
  switch (category) {
    case "IT_SUPPORT":
      return {
        estimated_hours: 1.5,
        safety_gear: ["ESD Wristband", "High-Voltage Insulated Shoes"],
        required_tools: ["Digital Multimeter", "Wire Strippers", "Conduit Clamp"],
        recommended_parts: ["3-core Copper Wire 2.5sqmm", "Insulation Sleeve"],
        procedure: [
          "De-energize circuit breaker for area branch",
          "Test for zero voltage using multimeter",
          "Inspect wiring and reconnect damaged conduits",
          "Verify grounding resistance and test load",
        ],
      };
    case "HOUSEKEEPING":
      return {
        estimated_hours: 0.8,
        safety_gear: ["Heavy Duty Rubber Gloves", "Slip-Resistant Overshoes"],
        required_tools: ["Floor Scrubber", "Wet Vacuum", "Caution Signs"],
        recommended_parts: ["Neutral Floor Cleaner (5L)", "Microfiber Mop Heads"],
        procedure: [
          "Place wet floor hazard signs around the perimeter",
          "Vacuum and mop affected area thoroughly",
          "Sanitize surrounding surfaces",
          "Confirm floor is completely dry and safe",
        ],
      };
    case "FACILITIES":
      return {
        estimated_hours: 2.5,
        safety_gear: ["Safety Helmet", "Leather Palm Work Gloves"],
        required_tools: ["Adjustable Spanner Set", "Cordless Drill", "Spirit Level"],
        recommended_parts: ["Heavy-Duty Door Closer / Bracket", "Anchor Bolts"],
        procedure: [
          "Inspect structural fasteners and hinges",
          "Align and torque mounting brackets to specification",
          "Adjust hydraulic sweep and latch damping valves",
          "Conduct 5-cycle opening/closing egress verification",
        ],
      };
    case "MAINTENANCE":
    default:
      return {
        estimated_hours: 2.0,
        safety_gear: ["Waterproof Work Gloves", "Protective Eyewear"],
        required_tools: ["Pipe Wrench Set", "PTFE Sealant Tape", "Drain Snake"],
        recommended_parts: ["Rubber Gasket Seal", "1/2 inch Brass Ball Valve"],
        procedure: [
          "Locate and shut off local isolation valve",
          "Drain residual line pressure into collection basin",
          "Disassemble leaking joint and install new gasket seal",
          "Repressurize system and verify zero seepage",
        ],
      };
  }
}

export function getSharedClusters(): ClusterDetail[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHARED_CLUSTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSharedClusters(clusters: ClusterDetail[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHARED_CLUSTERS_KEY, JSON.stringify(clusters));
    window.dispatchEvent(new Event("nivaran_clusters_updated"));
  } catch (err) {
    console.warn("Failed to persist shared clusters:", err);
  }
}

export function saveReportedComplaint(
  reportData: {
    title: string;
    description: string;
    category: string;
    severity: number;
    floor: string;
    coords: { x: number; y: number };
    roomOrZone: string;
    isAnonymous?: boolean;
    previewUrl?: string | null;
  },
  res: SubmissionResult
): ClusterDetail {
  const existing = getSharedClusters();
  const now = new Date().toISOString();

  // Look for existing cluster with same cluster_id or nearby on the same floor (within 35 canvas units)
  const matchIndex = existing.findIndex((c) => {
    if (c.id === res.cluster_id) return true;
    if (c.floor.toUpperCase() === reportData.floor.toUpperCase()) {
      const dx = c.x_coord - reportData.coords.x;
      const dy = c.y_coord - reportData.coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 35) return true;
      if (reportData.roomOrZone && c.room_or_zone && c.room_or_zone.toLowerCase() === reportData.roomOrZone.toLowerCase()) {
        return true;
      }
    }
    return false;
  });

  const complaintItem: Complaint = {
    id: res.complaint_id || `cmp-${Date.now()}`,
    user_id: reportData.isAnonymous ? "anonymous-user" : "student-1",
    cluster_id: res.cluster_id,
    title: reportData.title,
    description: reportData.description,
    category: reportData.category,
    severity: reportData.severity,
    image_url: reportData.previewUrl || null,
    floor: reportData.floor,
    x_coord: reportData.coords.x,
    y_coord: reportData.coords.y,
    room_or_zone: reportData.roomOrZone || null,
    created_at: now,
  };

  let targetCluster: ClusterDetail;

  if (matchIndex >= 0) {
    // Merge into existing cluster
    const matched = existing[matchIndex];
    const newCount = matched.complaint_count + 1;
    const newPriority = Math.min(99.5, matched.priority_score + 8.5);
    const newTier = newPriority >= 75 ? "EMERGENCY" : newPriority >= 50 ? "HIGH" : "MEDIUM";

    targetCluster = {
      ...matched,
      complaint_count: newCount,
      priority_score: newPriority,
      sla_tier: newTier,
      last_reported_at: now,
      complaints: [complaintItem, ...(matched.complaints || [])],
    };

    existing[matchIndex] = targetCluster;
  } else {
    // Create brand-new cluster
    const assignedDept =
      reportData.category === "IT_SUPPORT"
        ? "IT_SUPPORT"
        : reportData.category === "HOUSEKEEPING"
        ? "HOUSEKEEPING"
        : reportData.category === "FACILITIES"
        ? "FACILITIES"
        : "MAINTENANCE";

    const assignedTechId = reportData.category === "IT_SUPPORT" ? "tech-2" : "tech-1";

    targetCluster = {
      id: res.cluster_id,
      title: res.cluster_title || reportData.title,
      ai_summary: reportData.description,
      category: reportData.category,
      status: "ASSIGNED", // Assigned so technician and admin see it active
      priority_score: res.priority_score,
      severity_score: reportData.severity * 20,
      impact_score: reportData.severity >= 4 ? 80 : 50,
      complaint_count: 1,
      floor: reportData.floor,
      x_coord: reportData.coords.x,
      y_coord: reportData.coords.y,
      room_or_zone: reportData.roomOrZone || "Campus Corridor",
      sla_deadline: res.sla_deadline,
      assigned_technician_id: assignedTechId,
      assigned_department: assignedDept,
      first_reported_at: now,
      last_reported_at: now,
      sla_tier: res.sla_tier || (res.priority_score >= 75 ? "EMERGENCY" : "HIGH"),
      work_order_checklist: getWorkOrderChecklist(reportData.category, reportData.title),
      complaints: [complaintItem],
    };

    existing.unshift(targetCluster);
  }

  saveSharedClusters(existing);
  return targetCluster;
}

export function getSharedClusterDetail(id: string): ClusterDetail | null {
  const all = getSharedClusters();
  return all.find((c) => c.id === id) || null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function updateSharedClusterStatus(
  id: string,
  newStatus: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  _details?: { reason?: string; resolutionProofUrl?: string; similarityScore?: number }
): void {
  const all = getSharedClusters();
  const index = all.findIndex((c) => c.id === id);
  if (index >= 0) {
    all[index] = {
      ...all[index],
      status: newStatus,
      last_reported_at: new Date().toISOString(),
    };
    saveSharedClusters(all);
  }
}

/**
 * Merges API clusters (or fallback static clusters) with locally created/shared clusters.
 * Ensures that any report submitted by a student immediately surfaces in Technician and Admin views.
 */
export function mergeWithSharedClusters(baseClusters: Cluster[]): Cluster[] {
  const shared = getSharedClusters();
  if (shared.length === 0) return baseClusters;

  const sharedMap = new Map<string, Cluster>();
  for (const sc of shared) {
    sharedMap.set(sc.id, sc);
  }

  // First pass: replace any existing base cluster with updated shared state
  const result: Cluster[] = baseClusters.map((bc) => {
    if (sharedMap.has(bc.id)) {
      const updated = sharedMap.get(bc.id)!;
      sharedMap.delete(bc.id);
      return updated;
    }
    return bc;
  });

  // Second pass: prepend any new clusters filed by student that weren't in baseClusters
  const remainingShared = Array.from(sharedMap.values());
  const combined = [...remainingShared, ...result];

  // Sort by priority score descending
  return combined.sort((a, b) => b.priority_score - a.priority_score);
}
