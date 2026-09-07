"""Complaint intake router — BUILD.md Day 2 gate endpoint.

POST /api/v1/complaints  (multipart: title, description, latitude, longitude,
optional image) → runs the full intelligence pipeline → returns cluster info.
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from loguru import logger
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.ai.gemini_intake import run_intake
from app.db.models import User
from app.schemas.complaint_schemas import ComplaintSubmissionResult
from app.services.audit_service import log_action
from app.services.clustering_service import process_new_complaint
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
    without creating a complaint (§1.1 smart report form)."""
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image exceeds 10 MB limit.")
    try:
        intake = run_intake("Campus problem report attachment", image_bytes)
    except Exception as exc:
        logger.warning(f"Analyze pre-fill failed: {exc}")
        return {"category": None, "severity": None, "ocr_text": None}
    return {
        "category": intake.category,
        "severity": intake.severity,
        "impact": intake.impact,
        "ocr_text": intake.ocr_text,
        "ai_title": intake.ai_title,
    }


@router.post("", response_model=ComplaintSubmissionResult)
async def submit_complaint(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(status_code=422, detail="Invalid GPS coordinates.")

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
        latitude=latitude,
        longitude=longitude,
        image_bytes=image_bytes,
        image_url=image_url,
    )
    complaint, cluster = result["complaint"], result["cluster"]

    log_action(
        db,
        action_taken="COMPLAINT_SUBMITTED",
        cluster_id=cluster.id,
        complaint_id=complaint.id,
        actor_id=user.id,
        details={"merged": result["merged"], "category": intake_category(result)},
    )

    # Real-time broadcast (§3.5) — never blocks the response
    try:
        await manager.broadcast("admin", result["ws_event"], result["ws_payload"])
        await manager.broadcast("technician", result["ws_event"], result["ws_payload"])
    except Exception as exc:
        logger.warning(f"WS broadcast failed: {exc}")

    tier = result["sla_tier"]
    message = (
        f"Complaint merged into existing cluster — priority reinforced."
        if result["merged"]
        else f"New cluster registered and routed to {cluster.assigned_department}."
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
        reasoning=result["intake"].reasoning,
        message=message,
    )


def intake_category(result: dict) -> str:
    return result["intake"].category
