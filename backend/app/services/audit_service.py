"""Immutable audit-log service — concept ported from smart-civic-issue-reporter's
AuditService.js: audit writes never break the main flow (silent-fail)."""
import uuid

from loguru import logger
from sqlalchemy.orm import Session

from app.db.models import AuditLog


def log_action(
    db: Session,
    *,
    action_taken: str,
    cluster_id: uuid.UUID | None = None,
    complaint_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
    details: dict | None = None,
) -> None:
    try:
        db.add(
            AuditLog(
                cluster_id=cluster_id,
                complaint_id=complaint_id,
                actor_id=actor_id,
                action_taken=action_taken,
                details=details or {},
            )
        )
        db.flush()
    except Exception as exc:  # audit must never interrupt main operations
        logger.warning(f"Audit log write failed: {exc}")
        db.rollback()


def get_cluster_logs(db: Session, cluster_id: uuid.UUID) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.cluster_id == cluster_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
