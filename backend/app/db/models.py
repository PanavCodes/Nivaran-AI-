"""SQLAlchemy models — mirror backend/db/schema.sql exactly (BUILD.md §3.1).

Enums are created by schema.sql (create_type=False) — never by the ORM.
`updated_at` is maintained by the DB trigger, not the ORM.
"""
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

USER_ROLES = ("STUDENT", "FACULTY", "TECHNICIAN", "ADMIN")
TICKET_STATUSES = ("OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED")
ISSUE_CATEGORIES = ("IT_SUPPORT", "MAINTENANCE", "HOUSEKEEPING", "FACILITIES", "ADMINISTRATION")

user_role_enum = Enum(*USER_ROLES, name="user_role", create_type=False)
ticket_status_enum = Enum(*TICKET_STATUSES, name="ticket_status", create_type=False)
issue_category_enum = Enum(*ISSUE_CATEGORIES, name="issue_category", create_type=False)


class Base(DeclarativeBase):
    pass


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))


def _now() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _pk()
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(user_role_enum, default="STUDENT")
    department: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _now()


class IssueCluster(Base):
    __tablename__ = "issue_clusters"

    id: Mapped[uuid.UUID] = _pk()
    title: Mapped[str] = mapped_column(String(255))
    ai_summary: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(issue_category_enum)
    status: Mapped[str] = mapped_column(ticket_status_enum, default="OPEN")
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    severity_score: Mapped[int] = mapped_column(Integer)
    impact_score: Mapped[int] = mapped_column(Integer)
    complaint_count: Mapped[int] = mapped_column(Integer, default=1)
    latitude: Mapped[float] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float] = mapped_column(Numeric(9, 6))
    representative_embedding = mapped_column(Vector(384))
    assigned_technician_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_reported_at: Mapped[datetime] = _now()
    last_reported_at: Mapped[datetime] = _now()
    created_at: Mapped[datetime] = _now()
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assigned_department: Mapped[str] = mapped_column(String(100), default="MAINTENANCE")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = _pk()
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issue_clusters.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(issue_category_enum)
    severity: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String(512))
    resolution_proof_url: Mapped[str | None] = mapped_column(String(512))
    latitude: Mapped[float] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float] = mapped_column(Numeric(9, 6))
    embedding = mapped_column(Vector(384))
    created_at: Mapped[datetime] = _now()


class SlaEscalation(Base):
    __tablename__ = "sla_escalations"

    id: Mapped[uuid.UUID] = _pk()
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issue_clusters.id", ondelete="CASCADE")
    )
    escalation_level: Mapped[int] = mapped_column(Integer, default=1)
    notified_emails: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    next_check_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _now()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = _pk()
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issue_clusters.id", ondelete="CASCADE")
    )
    complaint_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    action_taken: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = _now()
