"""Cluster + admin schemas."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.complaint_schemas import ComplaintOut


class ClusterOut(BaseModel):
    id: str
    title: str
    ai_summary: str | None
    category: str
    status: str
    priority_score: float
    severity_score: int
    impact_score: int
    complaint_count: int
    latitude: float
    longitude: float
    sla_deadline: datetime | None
    assigned_technician_id: str | None
    assigned_department: str
    first_reported_at: datetime | None
    last_reported_at: datetime | None


class ClusterDetail(ClusterOut):
    complaints: list[ComplaintOut] = []
    sla_tier: str


class NearbyCluster(BaseModel):
    cluster_id: str
    title: str
    category: str
    priority_score: float
    complaint_count: int
    distance_m: float
    latitude: float
    longitude: float


class AssignRequest(BaseModel):
    technician_id: str


class ResolveResponse(BaseModel):
    cluster_id: str
    status: str
    verified: bool
    similarity_score: float | None
    reasoning: str


class AnalyticsOut(BaseModel):
    open_clusters: int
    avg_resolution_hours: float
    sla_breach_rate: float
    top_category: str


class TrendVolumePoint(BaseModel):
    date: str
    count: int


class TrendCategoryPoint(BaseModel):
    category: str
    count: int


class TrendsOut(BaseModel):
    volume: list[TrendVolumePoint]
    categories: list[TrendCategoryPoint]


class AuditOut(BaseModel):
    id: str
    cluster_id: str | None
    action_taken: str
    details: dict
    actor_id: str | None
    created_at: datetime
