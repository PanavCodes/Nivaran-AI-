"""Complaint & intake schemas."""
from datetime import datetime

from pydantic import BaseModel


class IntakeResponse(BaseModel):
    """Gemini intake contract with indoor floor and room detection."""
    category: str
    severity: int
    impact: int
    nsfw: bool = False
    ocr_text: str | None = None
    ai_title: str
    reasoning: str
    floor: str | None = None
    room_or_zone: str | None = None


class ComplaintOut(BaseModel):
    id: str
    user_id: str
    cluster_id: str | None
    title: str
    description: str
    category: str
    severity: int
    image_url: str | None
    floor: str
    x_coord: float
    y_coord: float
    room_or_zone: str | None = None
    created_at: datetime


class ComplaintSubmissionResult(BaseModel):
    complaint_id: str
    cluster_id: str
    cluster_title: str
    merged: bool
    category: str
    priority_score: float
    sla_tier: str
    sla_deadline: datetime
    complaint_count: int
    floor: str
    x_coord: float
    y_coord: float
    room_or_zone: str | None = None
    reasoning: str
    message: str


class MyClusterSnapshot(BaseModel):
    """Cluster status embedded in /complaints/mine rows."""

    id: str
    title: str
    status: str
    category: str
    priority_score: float
    sla_tier: str
    complaint_count: int
    sla_deadline: datetime | None
    assigned_department: str
    floor: str = "1"
    room_or_zone: str | None = None


class MyComplaintOut(BaseModel):
    """Reporter-facing complaint record with live cluster status."""

    id: str
    title: str
    description: str
    category: str
    severity: int
    image_url: str | None
    resolution_proof_url: str | None
    floor: str
    x_coord: float
    y_coord: float
    room_or_zone: str | None = None
    created_at: datetime
    cluster: MyClusterSnapshot | None

