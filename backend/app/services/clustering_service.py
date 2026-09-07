"""Spatio-semantic clustering — BUILD.md §3.2 decision logic + §6 addendum.

On every new complaint:
  1. intake (category/severity/impact)  2. embed(description)
  3. SPATIO_SEMANTIC_SEARCH  4. merge OR create  5. compute_priority
  6. WebSocket broadcast cluster.created / cluster.merged
"""
import uuid
from datetime import datetime, timezone

from loguru import logger
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.gemini_intake import run_intake
from app.ai.summary import generate_cluster_summary
from app.core.config import settings
from app.db.queries import SPATIO_SEMANTIC_SEARCH
from app.db.models import Complaint, IssueCluster
from app.services.embedding_service import blend, embed
from app.services.priority_service import compute_priority

# BUILD.md §6 addendum — routing map for assigned_department.
CATEGORY_DEPARTMENT_MAP = {
    "IT_SUPPORT": "IT Services",
    "MAINTENANCE": "Civil & Electrical Maintenance",
    "HOUSEKEEPING": "Sanitation & Housekeeping",
    "FACILITIES": "Campus Estate Office",
    "ADMINISTRATION": "Registrar Operations",
}

# Degrees for the bounding-box pre-filter (§3.2: 50 m ≈ 0.00045°).
_BBOX_DEG = settings.AUTO_CLUSTER_RADIUS_METERS * 0.000009


def _find_matching_cluster(db: Session, category: str, lat: float, lon: float, embedding: list[float]):
    result = db.execute(
        SPATIO_SEMANTIC_SEARCH,
        {
            "new_category": category,
            "new_lat": lat,
            "new_lon": lon,
            "new_embedding": str(embedding),
            "bbox_deg": _BBOX_DEG,
            "radius_m": settings.AUTO_CLUSTER_RADIUS_METERS,
            "threshold": settings.MIN_SEMANTIC_SIMILARITY_THRESHOLD,
        },
    )
    return result.mappings().first()


def process_new_complaint(
    db: Session,
    *,
    user_id: uuid.UUID,
    title: str,
    description: str,
    latitude: float,
    longitude: float,
    image_bytes: bytes | None = None,
    image_url: str | None = None,
) -> dict:
    """Full intake → cluster → priority pipeline. Returns submission result dict."""
    # 1. Gemini multi-modal intake (category, severity, impact, ocr, title)
    intake = run_intake(f"{title}. {description}" if title else description, image_bytes)
    if title:
        intake.ai_title = title  # reporter's own title wins for the complaint record

    # 2. Embed the complaint text (384-dim, normalised)
    embedding = embed(f"{title} {description}".strip())

    # 3. Spatio-semantic search for an existing open cluster
    match = _find_matching_cluster(db, intake.category, latitude, longitude, embedding)

    now = datetime.now(timezone.utc)
    complaint = Complaint(
        user_id=user_id,
        title=title or intake.ai_title,
        description=description,
        category=intake.category,
        severity=intake.severity,
        image_url=image_url,
        latitude=latitude,
        longitude=longitude,
        embedding=str(embedding),
        created_at=now,
    )

    if match:
        # ── MERGE into existing cluster (§3.2 decision logic) ──────────────
        cluster = db.get(IssueCluster, match["cluster_id"])
        cluster.complaint_count += 1
        cluster.last_reported_at = now
        cluster.severity_score = max(cluster.severity_score, intake.severity)
        cluster.impact_score = max(cluster.impact_score, intake.impact)

        existing_vec = list(cluster.representative_embedding)
        cluster.representative_embedding = str(blend(existing_vec, embedding))

        # 5. Recompute priority with new recurrence count
        score, tier, deadline = compute_priority(
            cluster.severity_score,
            cluster.complaint_count,
            cluster.impact_score,
            cluster.first_reported_at,
        )
        cluster.priority_score = score
        cluster.sla_deadline = deadline

        complaint.cluster_id = cluster.id
        db.add(complaint)
        db.flush()

        cluster.ai_summary = generate_cluster_summary(cluster, intake.category)
        merged = True
        event = "cluster.merged"
        logger.info(f"Complaint merged into cluster {cluster.id} (count={cluster.complaint_count}, P={score})")
    else:
        # ── CREATE fresh cluster (§3.2 decision logic) ─────────────────────
        score, tier, deadline = compute_priority(
            intake.severity, 1, intake.impact, now
        )
        cluster = IssueCluster(
            title=intake.ai_title,
            ai_summary=None,
            category=intake.category,
            status="OPEN",
            severity_score=intake.severity,
            impact_score=intake.impact,
            complaint_count=1,
            latitude=latitude,
            longitude=longitude,
            representative_embedding=str(embedding),
            sla_deadline=deadline,
            first_reported_at=now,
            last_reported_at=now,
            assigned_department=CATEGORY_DEPARTMENT_MAP.get(intake.category, "MAINTENANCE"),
            priority_score=score,
        )
        db.add(cluster)
        db.flush()

        complaint.cluster_id = cluster.id
        db.add(complaint)
        db.flush()

        cluster.ai_summary = generate_cluster_summary(cluster, intake.category)
        merged = False
        event = "cluster.created"
        logger.info(f"New cluster created {cluster.id} (P={score}, tier={tier})")

    # 6. Real-time broadcast to the admin room (§3.5 event table)
    payload = {
        "cluster_id": str(cluster.id),
        "title": cluster.title,
        "new_priority_score": cluster.priority_score,
        "priority_score": cluster.priority_score,
        "complaint_count": cluster.complaint_count,
        "lat": float(cluster.latitude),
        "lon": float(cluster.longitude),
    }

    return {
        "complaint": complaint,
        "cluster": cluster,
        "merged": merged,
        "priority_score": cluster.priority_score,
        "sla_tier": tier,
        "sla_deadline": deadline,
        "intake": intake,
        "ws_event": event,
        "ws_payload": payload,
    }
