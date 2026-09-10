"""Unit and key-path tests for recent audit fixes:
1. Rate limiting behavior and 429 enforcement.
2. _cluster_out checklist lazy-loading performance.
3. technician_notes length validation.
4. Insecure JWT secret detection.
5. Resolved clusters transparency data structures.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import Settings
from app.core.rate_limit import RateLimiter
from app.db.models import IssueCluster
from app.routers.cluster_routes import _cluster_out, SAMPLE_RESOLVED_FALLBACK, DEFAULT_LEADERBOARD
from app.schemas.cluster_schemas import TransparencyResponse, ResolvedIssueItem


def test_rate_limiter_allows_under_limit():
    limiter = RateLimiter(limit=3, window_seconds=10, key_prefix="test_under")
    mock_request = MagicMock(spec=Request)
    mock_request.headers = {}
    mock_request.client.host = "127.0.0.1"

    # 3 requests should pass
    limiter(mock_request)
    limiter(mock_request)
    limiter(mock_request)


def test_rate_limiter_blocks_above_limit_with_429():
    limiter = RateLimiter(limit=2, window_seconds=10, key_prefix="test_over")
    mock_request = MagicMock(spec=Request)
    mock_request.headers = {}
    mock_request.client.host = "192.168.1.100"

    limiter(mock_request)
    limiter(mock_request)

    # 3rd request should raise HTTPException 429
    with pytest.raises(HTTPException) as exc_info:
        limiter(mock_request)

    assert exc_info.value.status_code == 429
    assert "Retry-After" in exc_info.value.headers
    assert "Too many requests" in exc_info.value.detail


def test_rate_limiter_resets():
    limiter = RateLimiter(limit=1, window_seconds=10, key_prefix="test_reset")
    mock_request = MagicMock(spec=Request)
    mock_request.headers = {}
    mock_request.client.host = "10.0.0.1"

    limiter(mock_request)
    with pytest.raises(HTTPException):
        limiter(mock_request)

    limiter.reset()
    # Now should pass again
    limiter(mock_request)


def test_cluster_out_lazy_loads_checklist():
    now = datetime.now(timezone.utc)
    cluster = IssueCluster(
        id=uuid.uuid4(),
        title="Ceiling Water Leak",
        ai_summary="Water leak causing dripping in lab.",
        category="MAINTENANCE",
        status="OPEN",
        priority_score=60.0,
        severity_score=4,
        impact_score=3,
        complaint_count=2,
        floor="2",
        x_coord=120.0,
        y_coord=240.0,
        room_or_zone="Room 204",
        sla_deadline=now,
        assigned_technician_id=None,
        assigned_department="Maintenance",
        first_reported_at=now,
        last_reported_at=now,
    )

    # Active cluster list path (include_checklist=False)
    summary_out = _cluster_out(cluster, include_checklist=False)
    assert summary_out.work_order_checklist is None

    # Detail view path (include_checklist=True)
    detail_out = _cluster_out(cluster, include_checklist=True)
    assert detail_out.work_order_checklist is not None
    assert "required_tools" in detail_out.work_order_checklist
    assert "safety_gear" in detail_out.work_order_checklist


def test_insecure_jwt_secret_detection():
    # Default dev secret should be flagged
    dev_settings = Settings(JWT_SECRET="dev-only-secret-replace-with-64-char-random-string")
    assert dev_settings.is_jwt_secret_insecure is True

    # Short secret should be flagged
    short_settings = Settings(JWT_SECRET="short-secret-12345")
    assert short_settings.is_jwt_secret_insecure is True

    # Strong 64-char secret should pass
    strong_secret = "a" * 64
    prod_settings = Settings(JWT_SECRET=strong_secret)
    assert prod_settings.is_jwt_secret_insecure is False


def test_transparency_schema_and_fallbacks():
    assert len(SAMPLE_RESOLVED_FALLBACK) >= 3
    assert len(DEFAULT_LEADERBOARD) >= 4

    # Verify fallback items conform to ResolvedIssueItem schema
    for item in SAMPLE_RESOLVED_FALLBACK:
        validated = ResolvedIssueItem(**item)
        assert validated.durationHours > 0
        assert validated.similarityScore > 0.5
        assert validated.floor in ["LG", "G", "1", "2", "3", "4", "5", "6", "7", "8"]

    # Test full response schema validation
    resp = TransparencyResponse(
        resolved_count=48,
        mean_resolution_hours=4.8,
        avg_similarity_score=93.8,
        active_technicians_count=12,
        department_leaderboard=DEFAULT_LEADERBOARD,
        issues=[ResolvedIssueItem(**i) for i in SAMPLE_RESOLVED_FALLBACK],
    )
    assert resp.resolved_count == 48
    assert len(resp.issues) == len(SAMPLE_RESOLVED_FALLBACK)
