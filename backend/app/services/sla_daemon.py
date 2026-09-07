"""SLA escalation daemon — APScheduler worker (BUILD.md §2.2/§4 Day 4).

Runs every 5 minutes:
  • recompute priority for open clusters (duration grows → score grows)
  • escalate clusters past their SLA deadline (level++, audit, broadcast)
"""
from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy import select

from app.core.config import settings
from app.db.models import IssueCluster, SlaEscalation
from app.db.session import get_session_factory
from app.services.audit_service import log_action
from app.services.priority_service import compute_priority
from app.services.websocket_manager import manager

ESCALATION_RECIPIENTS = ["admin@nivaran.edu", "warden@nivaran.edu"]


def _tick() -> None:
    db = get_session_factory()()
    escalated: list[dict] = []
    try:
        now = datetime.now(timezone.utc)
        open_clusters = db.execute(
            select(IssueCluster).where(IssueCluster.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"]))
        ).scalars().all()

        for cluster in open_clusters:
            score, tier, deadline = compute_priority(
                cluster.severity_score,
                cluster.complaint_count,
                cluster.impact_score,
                cluster.first_reported_at,
            )
            cluster.priority_score = score
            cluster.sla_deadline = deadline

            breached = cluster.sla_deadline is not None and now > cluster.sla_deadline
            if breached:
                last = (
                    db.query(SlaEscalation)
                    .filter(SlaEscalation.cluster_id == cluster.id)
                    .order_by(SlaEscalation.escalation_level.desc())
                    .first()
                )
                next_level = (last.escalation_level + 1) if last else 1
                # Re-notify at most every 60 minutes per level
                if last and last.next_check_at.replace(tzinfo=timezone.utc) > now:
                    continue
                db.add(
                    SlaEscalation(
                        cluster_id=cluster.id,
                        escalation_level=next_level,
                        notified_emails=list(ESCALATION_RECIPIENTS),
                        next_check_at=now + timedelta(minutes=60),
                    )
                )
                logger.warning(
                    f"SLA escalation L{next_level} for cluster {cluster.id} (P={score})"
                )
                log_action(
                    db,
                    action_taken="SLA_ESCALATED",
                    cluster_id=cluster.id,
                    details={"level": next_level, "priority_score": score, "tier": tier},
                )
                escalated.append(
                    {
                        "cluster_id": str(cluster.id),
                        "sla_tier": tier,
                        "deadline": deadline.isoformat(),
                        "escalation_level": next_level,
                    }
                )

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"SLA daemon tick failed: {exc}")
    finally:
        db.close()

    # Broadcast after commit (§3.5: cluster.escalated → admin + technician rooms)
    for payload in escalated:
        import asyncio

        for room in ("admin", "technician"):
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                asyncio.run(manager.broadcast(room, "cluster.escalated", payload))
                continue
            asyncio.create_task(manager.broadcast(room, "cluster.escalated", payload))


def start_scheduler() -> "BackgroundScheduler":
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(_tick, "interval", minutes=5, id="sla_daemon", max_instances=1)
    scheduler.start()
    logger.info("SLA escalation daemon started (every 5 min)")
    return scheduler
