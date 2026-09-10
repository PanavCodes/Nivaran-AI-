"""Complaint intake router — BUILD.md Day 2 gate endpoint.

POST /api/v1/complaints  (multipart: title, description, floor, x_coord, y_coord,
                          room_or_zone, image) → runs the full intelligence pipeline → returns cluster info.
GET  /api/v1/complaints/mine  (student/faculty status tracking — abstract
"monitor the status of their reports and receive resolution updates")
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from loguru import logger
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.ai.gemini_intake import run_intake
from app.db.models import Complaint, IssueCluster, User
from app.schemas.complaint_schemas import (
    ComplaintSubmissionResult,
    MyComplaintOut,
    MyClusterSnapshot,
)
from app.services.audit_service import log_action
from app.services.clustering_service import process_new_complaint
from app.services.priority_service import tier_for_score
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/analyze")
async def analyze_media(
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Intake AI pre-fill: read the dropped photo, return category/severity/OCR
    without creating a complaint (§1.1 smart report form). Adds the FixMyStreet
    damage grade (OpenCV) and, for waste scenes, the YOLO litter-density hook."""
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image exceeds 10 MB limit.")
    try:
        intake = run_intake("Campus problem report attachment", image_bytes)
    except Exception as exc:
        logger.warning(f"Analyze pre-fill failed: {exc}")
        return {"category": None, "severity": None, "ocr_text": None}

    # Secondary vision signals (both degrade gracefully when deps/models absent)
    damage = None
    litter = None
    try:
        from app.vision.damage_grader import grade_damage

        damage = grade_damage(image_bytes)
    except Exception as exc:
        logger.debug(f"Damage grading skipped: {exc}")
    if damage and intake.category == "HOUSEKEEPING":
        try:
            from app.vision.litter_detector import detect_waste_density

            litter = detect_waste_density(image_bytes)
        except Exception as exc:
            logger.debug(f"Litter detection skipped: {exc}")

    return {
        "category": intake.category,
        "severity": intake.severity,
        "impact": intake.impact,
        "ocr_text": intake.ocr_text,
        "ai_title": intake.ai_title,
        "floor": intake.floor,
        "room_or_zone": intake.room_or_zone,
        "image_damage": damage,
        "litter_density": litter,
    }


@router.get("/mine", response_model=list[MyComplaintOut])
def my_complaints(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Status tracking for the reporter's own submissions (abstract Target
    Users: students 'monitor the status of their reports')."""
    rows = db.execute(
        select(Complaint, IssueCluster)
        .join(IssueCluster, Complaint.cluster_id == IssueCluster.id, isouter=True)
        .where(Complaint.user_id == user.id)
        .order_by(Complaint.created_at.desc())
    ).all()

    out: list[MyComplaintOut] = []
    for complaint, cluster in rows:
        snapshot = None
        if cluster is not None:
            snapshot = MyClusterSnapshot(
                id=str(cluster.id),
                title=cluster.title,
                status=cluster.status,
                category=cluster.category,
                priority_score=cluster.priority_score,
                sla_tier=tier_for_score(cluster.priority_score),
                complaint_count=cluster.complaint_count,
                sla_deadline=cluster.sla_deadline,
                assigned_department=cluster.assigned_department,
                floor=cluster.floor,
                room_or_zone=cluster.room_or_zone,
            )
        out.append(
            MyComplaintOut(
                id=str(complaint.id),
                title=complaint.title,
                description=complaint.description,
                category=complaint.category,
                severity=complaint.severity,
                image_url=complaint.image_url,
                resolution_proof_url=complaint.resolution_proof_url,
                floor=complaint.floor,
                x_coord=complaint.x_coord,
                y_coord=complaint.y_coord,
                room_or_zone=complaint.room_or_zone,
                created_at=complaint.created_at,
                cluster=snapshot,
            )
        )
    return out


@router.post("", response_model=ComplaintSubmissionResult)
async def submit_complaint(
    title: str = Form(...),
    description: str = Form(...),
    floor: str = Form("1"),
    x_coord: float = Form(180.0),
    y_coord: float = Form(267.0),
    room_or_zone: str | None = Form(None),
    is_anonymous: bool = Form(False),
    image: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate indoor floor ID
    valid_floors = {"LG", "G", "1", "2", "3", "4", "5", "6", "7", "8"}
    norm_floor = floor.strip().upper()
    if norm_floor not in valid_floors:
        norm_floor = "1"

    image_url = None
    image_bytes = None
    if image is not None and image.filename:
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="Image exceeds 10 MB limit.")
        ext = Path(image.filename).suffix.lower() or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        (UPLOAD_DIR / fname).write_bytes(image_bytes)
        image_url = f"/uploads/{fname}"

    result = process_new_complaint(
        db,
        user_id=user.id,
        title=title,
        description=description,
        floor=norm_floor,
        x_coord=x_coord,
        y_coord=y_coord,
        room_or_zone=room_or_zone,
        image_bytes=image_bytes,
        image_url=image_url,
    )
    complaint, cluster = result["complaint"], result["cluster"]

    log_action(
        db,
        action_taken="COMPLAINT_SUBMITTED",
        cluster_id=cluster.id,
        complaint_id=complaint.id,
        actor_id=user.id if not is_anonymous else None,
        details={
            "merged": result["merged"],
            "category": intake_category(result),
            "floor": cluster.floor,
            "room_or_zone": cluster.room_or_zone,
            "is_anonymous": is_anonymous,
        },
    )

    # Real-time broadcast (§3.5) — never blocks the response
    try:
        await manager.broadcast("admin", result["ws_event"], result["ws_payload"])
        await manager.broadcast("technician", result["ws_event"], result["ws_payload"])
    except Exception as exc:
        logger.warning(f"WS broadcast failed: {exc}")

    tier = result["sla_tier"]
    message = (
        f"Complaint merged into existing cluster on Floor {cluster.floor} — priority reinforced."
        if result["merged"]
        else f"New cluster registered on Floor {cluster.floor} and routed to {cluster.assigned_department}."
    )
    return ComplaintSubmissionResult(
        complaint_id=str(complaint.id),
        cluster_id=str(cluster.id),
        cluster_title=cluster.title,
        merged=result["merged"],
        category=complaint.category,
        priority_score=result["priority_score"],
        sla_tier=tier,
        sla_deadline=result["sla_deadline"],
        complaint_count=cluster.complaint_count,
        floor=cluster.floor,
        x_coord=float(cluster.x_coord),
        y_coord=float(cluster.y_coord),
        room_or_zone=cluster.room_or_zone,
        reasoning=result["intake"].reasoning,
        message=message,
    )


def intake_category(result: dict) -> str:
    return result["intake"].category
