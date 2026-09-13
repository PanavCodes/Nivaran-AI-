export interface NearbyCluster {
  cluster_id: string;
  title: string;
  category: string;
  priority_score: number;
  complaint_count: number;
  distance_units: number;
  floor: string;
  x_coord: number;
  y_coord: number;
  room_or_zone?: string | null;
}

export interface Cluster {
  id: string;
  title: string;
  ai_summary: string | null;
  category: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority_score: number;
  severity_score: number;
  impact_score: number;
  complaint_count: number;
  floor: string;
  x_coord: number;
  y_coord: number;
  room_or_zone: string | null;
  sla_deadline: string | null;
  assigned_technician_id: string | null;
  assigned_department: string;
  first_reported_at: string | null;
  last_reported_at: string | null;
  work_order_checklist?: WorkOrderChecklist | null;
}

export interface Complaint {
  id: string;
  user_id: string;
  cluster_id: string | null;
  title: string;
  description: string;
  category: string;
  severity: number;
  image_url: string | null;
  floor: string;
  x_coord: number;
  y_coord: number;
  room_or_zone?: string | null;
  created_at: string;
}

export interface WorkOrderChecklist {
  estimated_hours: number;
  safety_gear: string[];
  required_tools: string[];
  recommended_parts: string[];
  procedure: string[];
}

export interface ClusterDetail extends Cluster {
  complaints: Complaint[];
  sla_tier: string;
  work_order_checklist?: WorkOrderChecklist | null;
}

export interface FloorSummaryItem {
  floor: string;
  open_count: number;
  emergency_count: number;
  max_priority: number;
}

export interface Analytics {
  open_clusters: number;
  avg_resolution_hours: number;
  sla_breach_rate: number;
  top_category: string;
}

export const TIER_COLORS: Record<string, string> = {
  EMERGENCY: "#ff3b30",
  HIGH: "#ffcc00",
  MEDIUM: "#ff9500",
  LOW: "#34c759",
};

export function tierForScore(score: number): keyof typeof TIER_COLORS {
  if (score >= 75) return "EMERGENCY";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export const CATEGORY_LABELS: Record<string, string> = {
  IT_SUPPORT: "IT Support",
  MAINTENANCE: "Maintenance",
  HOUSEKEEPING: "Housekeeping",
  FACILITIES: "Facilities",
  ADMINISTRATION: "Administration",
};

export interface MyClusterSnapshot {
  id: string;
  title: string;
  status: string;
  category: string;
  priority_score: number;
  sla_tier: string;
  complaint_count: number;
  sla_deadline: string | null;
  assigned_department: string;
  floor: string;
  room_or_zone: string | null;
}

export interface MyComplaint {
  id: string;
  user_id?: string | null;
  cluster_id?: string | null;
  title: string;
  description: string;
  category: string;
  severity: number;
  image_url: string | null;
  resolution_proof_url: string | null;
  resolution_similarity_score?: number | null;
  floor: string;
  x_coord: number;
  y_coord: number;
  room_or_zone?: string | null;
  created_at: string;
  cluster: MyClusterSnapshot | null;
}

export interface SubmissionResult {
  complaint_id: string;
  cluster_id: string;
  cluster_title: string;
  merged: boolean;
  category: string;
  priority_score: number;
  sla_tier: string;
  sla_deadline: string;
  complaint_count: number;
  floor: string;
  x_coord: number;
  y_coord: number;
  room_or_zone?: string | null;
  reasoning: string;
  message: string;
}

