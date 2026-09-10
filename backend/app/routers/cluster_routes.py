"""Cluster operations router — BUILD.md §1.2/§1.3 + Day 3 endpoints.

GET  /api/v1/clusters/active?status=OPEN,ASSIGNED   (priority-desc queue)
GET  /api/v1/clusters/nearby?lat&lon&q              (intake sidebar)
GET  /api/v1/clusters/{id}                          (flyout detail)
PATCH /api/v1/clusters/{id}/assign                  (WS push notification)
POST /api/v1/clusters/{id}/resolve                  (dual-proof close-out)
GET  /api/v1/clusters/{id}/audit                    (immutable trail)
"""
import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from loguru import logger
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.gemini_intake import recommend_work_order_checklist, verify_resolution_proof
from app.core.deps import get_current_user, get_db, require_role
from app.db.models import Complaint, IssueCluster, User
from app.schemas.cluster_schemas import (
    AssignRequest,
    AuditOut,
    ClusterDetail,
    ClusterOut,
    NearbyCluster,
    ResolveResponse,
)
from app.services.audit_service import get_cluster_logs, log_action
from app.services.priority_service import tier_for_score
from app.services.websocket_manager import manager
from sqlalchemy import or_

from app.db.queries import FLOOR_INCIDENT_SUMMARY, NEARBY_CLUSTERS
from app.schemas.cluster_schemas import FloorSummaryItem

router = APIRouter(prefix="/api/v1/clusters", tags=["Clusters"])


def _tier_deadline_hours(tier: str) -> int:
    return {"EMERGENCY": 2, "HIGH": 12, "MEDIUM": 24, "LOW": 72}[tier]


def _cluster_out(c: IssueCluster) -> ClusterOut:
    checklist = recommend_work_order_checklist(c.category, c.title, c.ai_summary or "")
    return ClusterOut(
        id=str(c.id),
        title=c.title,
        ai_summary=c.ai_summary,
        category=c.category,
        status=c.status,
        priority_score=c.priority_score,
        severity_score=c.severity_score,
        impact_score=c.impact_score,
        complaint_count=c.complaint_count,
        floor=c.floor,
        x_coord=float(c.x_coord),
        y_coord=float(c.y_coord),
        room_or_zone=c.room_or_zone,
        sla_deadline=c.sla_deadline,
        assigned_technician_id=str(c.assigned_technician_id) if c.assigned_technician_id else None,
        assigned_department=c.assigned_department,
        first_reported_at=c.first_reported_at,
        last_reported_at=c.last_reported_at,
        work_order_checklist=checklist,
    )


@router.get("/floors/summary", response_model=list[FloorSummaryItem])
def floors_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Floor incident density for the indoor building navigator."""
    rows = db.execute(FLOOR_INCIDENT_SUMMARY).mappings().all()
    indexed = {r["floor"]: r for r in rows}
    all_floors = ["8", "7", "6", "5", "4", "3", "2", "1", "G", "LG"]
    return [
        FloorSummaryItem(
            floor=f,
            open_count=int(indexed.get(f, {}).get("open_count", 0)),
            emergency_count=int(indexed.get(f, {}).get("emergency_count", 0)),
            max_priority=float(indexed.get(f, {}).get("max_priority", 0.0)),
        )
        for f in all_floors
    ]


@router.get("/active")
def active_clusters(
    status: str | None = None,
    floor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Active clusters sorted by priority_score desc. Supports status & floor filtering."""
    q = select(IssueCluster)
    if status:
        wanted = [s.strip().upper() for s in status.split(",") if s.strip()]
        q = q.where(IssueCluster.status.in_(wanted))
    if floor:
        q = q.where(IssueCluster.floor == floor.strip().upper())
    q = q.order_by(IssueCluster.priority_score.desc())
    clusters = db.execute(q).scalars().all()
    return [_cluster_out(c).model_dump() for c in clusters]


@router.get("/nearby", response_model=list[NearbyCluster])
def nearby_clusters(
    floor: str,
    x: float,
    y: float,
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Nearby active clusters on the current indoor floor for the intake portal's floating sidebar."""
    rows = db.execute(
        NEARBY_CLUSTERS,
        {"floor": floor.strip().upper(), "x": x, "y": y, "q": q},
    ).mappings().all()
    return [
        NearbyCluster(
            cluster_id=str(r["cluster_id"]),
            title=r["title"],
            category=r["category"],
            priority_score=r["priority_score"],
            complaint_count=r["complaint_count"],
            distance_units=float(r["distance_units"]),
            floor=r["floor"],
            x_coord=float(r["x_coord"]),
            y_coord=float(r["y_coord"]),
            room_or_zone=r["room_or_zone"],
        )
        for r in rows
    ]


@router.get("/technicians")
def list_technicians(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    techs = db.execute(
        select(User).where(User.role == "TECHNICIAN", User.is_active.is_(True))
    ).scalars().all()
    return [{"id": str(t.id), "full_name": t.full_name, "department": t.department} for t in techs]


@router.get("/{cluster_id}", response_model=ClusterDetail)
def cluster_detail(
    cluster_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    complaints = (
        db.execute(
            select(Complaint)
            .where(Complaint.cluster_id == cluster_id)
            .order_by(Complaint.created_at.asc())
        )
        .scalars()
        .all()
    )

    base = _cluster_out(cluster)
    return ClusterDetail(
        **base.model_dump(),
        sla_tier=tier_for_score(cluster.priority_score),
        complaints=[
            {
                "id": str(cp.id),
                "user_id": str(cp.user_id),
                "cluster_id": str(cp.cluster_id) if cp.cluster_id else None,
                "title": cp.title,
                "description": cp.description,
                "category": cp.category,
                "severity": cp.severity,
                "image_url": cp.image_url,
                "floor": cp.floor,
                "x_coord": float(cp.x_coord),
                "y_coord": float(cp.y_coord),
                "room_or_zone": cp.room_or_zone,
                "created_at": cp.created_at,
            }
            for cp in complaints
        ],
    )


class AssignResponse(BaseModel):
    cluster_id: str
    assigned_technician_id: str
    status: str


class StatusChangeRequest(BaseModel):
    """§1.3 swipe actions — En-Route (IN_PROGRESS) or defer back to OPEN."""

    status: str  # OPEN | IN_PROGRESS
    reason: str | None = None  # required when deferring


class StatusChangeResponse(BaseModel):
    cluster_id: str
    status: str
    action: str


@router.post("/{cluster_id}/status", response_model=StatusChangeResponse)
async def change_status(
    cluster_id: uuid.UUID,
    body: StatusChangeRequest,
    user: User = Depends(require_role("TECHNICIAN", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Technician field transitions: swipe-right → En-Route (IN_PROGRESS),
    swipe-left → defer with reason (back to OPEN, reason audit-logged)."""
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    if cluster.status in ("RESOLVED", "CLOSED"):
        raise HTTPException(status_code=409, detail="Cluster already resolved.")

    target = body.status.upper()
    if target == "IN_PROGRESS":
        action = "EN_ROUTE"
        cluster.status = "IN_PROGRESS"
        details = {"technician": user.full_name}
    elif target == "OPEN":
        action = "DEFERRED"
        if not body.reason:
            raise HTTPException(status_code=422, detail="A reason is required when deferring.")
        cluster.status = "OPEN"
        details = {"reason": body.reason, "deferred_by": user.full_name}
    else:
        raise HTTPException(status_code=422, detail="status must be OPEN or IN_PROGRESS.")

    db.flush()
    log_action(db, action_taken=action, cluster_id=cluster.id, actor_id=user.id, details=details)

    payload = {
        "cluster_id": str(cluster.id),
        "title": cluster.title,
        "status": cluster.status,
        "action": action,
        "by": user.full_name,
        **details,
    }
    try:
        await manager.broadcast("admin", "cluster.status_changed", payload)
        await manager.broadcast("technician", "cluster.status_changed", payload)
    except Exception as exc:
        logger.warning(f"WS status broadcast failed: {exc}")

    return StatusChangeResponse(cluster_id=str(cluster.id), status=cluster.status, action=action)


@router.patch("/{cluster_id}/assign", response_model=AssignResponse)
async def assign_technician(
    cluster_id: uuid.UUID,
    body: AssignRequest,
    user: User = Depends(require_role("ADMIN", "FACULTY")),
    db: Session = Depends(get_db),
):
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    tech = db.get(User, uuid.UUID(body.technician_id))
    if tech is None or tech.role != "TECHNICIAN":
        raise HTTPException(status_code=422, detail="Target user is not a technician.")

    cluster.assigned_technician_id = tech.id
    if cluster.status == "OPEN":
        cluster.status = "ASSIGNED"
    db.flush()

    log_action(
        db,
        action_taken="TECHNICIAN_ASSIGNED",
        cluster_id=cluster.id,
        actor_id=user.id,
        details={"technician_id": str(tech.id), "technician_name": tech.full_name},
    )

    # One-click WebSocket-pushed notification (§1.2)
    payload = {
        "cluster_id": str(cluster.id),
        "title": cluster.title,
        "technician_id": str(tech.id),
        "technician_name": tech.full_name,
        "status": cluster.status,
        "priority_score": cluster.priority_score,
    }
    try:
        await manager.broadcast("technician", "cluster.assigned", payload)
    except Exception as exc:
        logger.warning(f"WS assign broadcast failed: {exc}")

    return AssignResponse(
        cluster_id=str(cluster.id),
        assigned_technician_id=str(tech.id),
        status=cluster.status,
    )


@router.post("/{cluster_id}/resolve", response_model=ResolveResponse)
async def resolve_cluster(
    cluster_id: uuid.UUID,
    proof_image: UploadFile = File(...),
    technician_notes: str = "",
    user: User = Depends(require_role("TECHNICIAN", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Dual-proof close-out: Gemini Vision compares before/after imagery."""
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    if cluster.status in ("RESOLVED", "CLOSED"):
        raise HTTPException(status_code=409, detail="Cluster already resolved.")

    before_url = None
    first_complaint = db.execute(
        select(Complaint).where(Complaint.cluster_id == cluster_id).order_by(Complaint.created_at.asc())
    ).scalars().first()
    if first_complaint:
        before_url = first_complaint.image_url

    proof_bytes = await proof_image.read()
    before_bytes = None
    if before_url:
        from pathlib import Path

        p = Path(before_url.lstrip("/"))
        if p.exists():
            before_bytes = p.read_bytes()

    verdict = verify_resolution_proof(before_bytes or proof_bytes, proof_bytes)
    if not verdict.get("verified", False):
        return ResolveResponse(
            cluster_id=str(cluster.id),
            status=cluster.status,
            verified=False,
            similarity_score=verdict.get("similarity_score"),
            reasoning=verdict.get("reasoning", "Verification failed — proof rejected."),
        )

    # Persist the proof image
    from pathlib import Path

    ext = Path(proof_image.filename or "proof.jpg").suffix.lower() or ".jpg"
    proof_name = f"proof_{uuid.uuid4().hex}{ext}"
    (Path("uploads") / proof_name).write_bytes(proof_bytes)

    cluster.status = "RESOLVED"
    if first_complaint:
        first_complaint.resolution_proof_url = f"/uploads/{proof_name}"
    db.flush()

    log_action(
        db,
        action_taken="CLUSTER_RESOLVED",
        cluster_id=cluster.id,
        actor_id=user.id,
        details={
            "similarity_score": verdict.get("similarity_score"),
            "reasoning": verdict.get("reasoning"),
            "technician_notes": technician_notes,
            "proof_url": f"/uploads/{proof_name}",
        },
    )

    payload = {
        "cluster_id": str(cluster.id),
        "resolved_by": user.full_name,
        "proof_url": f"/uploads/{proof_name}",
        "similarity_score": verdict.get("similarity_score"),
    }
    try:
        await manager.broadcast("admin", "cluster.resolved", payload)
        await manager.broadcast("technician", "cluster.resolved", payload)
    except Exception as exc:
        logger.warning(f"WS resolve broadcast failed: {exc}")

    return ResolveResponse(
        cluster_id=str(cluster.id),
        status=cluster.status,
        verified=True,
        similarity_score=verdict.get("similarity_score"),
        reasoning=verdict.get("reasoning", ""),
    )


@router.get("/{cluster_id}/audit", response_model=list[AuditOut])
def cluster_audit(
    cluster_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        AuditOut(
            id=str(a.id),
            cluster_id=str(a.cluster_id) if a.cluster_id else None,
            action_taken=a.action_taken,
            details=a.details,
            actor_id=str(a.actor_id) if a.actor_id else None,
            created_at=a.created_at,
        )
        for a in get_cluster_logs(db, cluster_id)
    ]


@router.post("/{cluster_id}/reinforce")
async def reinforce_cluster(
    cluster_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """'Me Too / Upvote Reinforce' pattern adapted from CampFeed & Civic-Fix.
    Allows students/faculty to reinforce an existing cluster, boosting urgency and priority."""
    cluster = db.get(IssueCluster, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=404, detail="Cluster not found.")

    # Increment count and boost priority
    cluster.complaint_count += 1
    cluster.priority_score = min(100.0, float(cluster.priority_score) + 8.5)
    cluster.last_reported_at = datetime.now(timezone.utc)
    db.flush()

    log_action(
        db,
        action_taken="CLUSTER_REINFORCED",
        cluster_id=cluster.id,
        actor_id=user.id,
        details={
            "new_count": cluster.complaint_count,
            "new_priority": cluster.priority_score,
            "user": user.full_name,
        },
    )

    payload = {
        "cluster_id": str(cluster.id),
        "title": cluster.title,
        "complaint_count": cluster.complaint_count,
        "priority_score": cluster.priority_score,
        "floor": cluster.floor,
        "room_or_zone": cluster.room_or_zone,
    }
    try:
        await manager.broadcast("admin", "cluster.reinforced", payload)
        await manager.broadcast("technician", "cluster.reinforced", payload)
    except Exception as exc:
        logger.warning(f"WS reinforce broadcast failed: {exc}")

    return {
        "status": "success",
        "cluster_id": str(cluster.id),
        "complaint_count": cluster.complaint_count,
        "priority_score": cluster.priority_score,
    }
