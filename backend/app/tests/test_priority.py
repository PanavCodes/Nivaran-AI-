"""Priority engine unit tests — BUILD.md Day 2 gate (§3.4 formula)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services.priority_service import compute_priority, tier_for_score

NOW = datetime.now(timezone.utc)


def test_single_fresh_complaint_medium():
    # S=4, R=1, I=4, D≈0 → 28 + 3.5 + 16 ≈ 47.5 → MEDIUM
    score, tier, deadline = compute_priority(4, 1, 4, NOW)
    assert score == pytest.approx(47.5, abs=0.1)
    assert tier == "MEDIUM"
    deadline_hours = (deadline - NOW).total_seconds() / 3600
    assert abs(deadline_hours - 24) < 0.1


def test_demo_script_escalation_to_emergency():
    # Judge demo §6.3: S=4, R=2, I=4, D=2h → 28 + 7 + 16 + 0.5 = 51.5
    first = NOW - timedelta(hours=2)
    score, tier, deadline = compute_priority(4, 2, 4, first)
    assert score == pytest.approx(51.5, abs=0.1)
    assert tier == "HIGH"
    deadline_hours = (deadline - NOW).total_seconds() / 3600
    assert abs(deadline_hours - 12) < 0.1


def test_emergency_threshold():
    # S=5, R=6, I=5, D=1h → 35 + 21 + 20 + 0.25 = 76.25 ≥ 75 → EMERGENCY, 2h SLA
    first = NOW - timedelta(hours=1)
    score, tier, deadline = compute_priority(5, 6, 5, first)
    assert score == pytest.approx(76.25, abs=0.1)
    assert tier == "EMERGENCY"
    deadline_hours = (deadline - NOW).total_seconds() / 3600
    assert abs(deadline_hours - 2) < 0.1


def test_low_priority():
    # S=1, R=1, I=1, D=0 → 7 + 3.5 + 4 = 14.5 → LOW, 72h
    score, tier, _ = compute_priority(1, 1, 1, NOW)
    assert score == pytest.approx(14.5, abs=0.1)
    assert tier == "LOW"


def test_recurrence_and_duration_capped():
    # R capped at 10 (35), D capped at 48 (12)
    first = NOW - timedelta(hours=500)
    score, tier, _ = compute_priority(5, 50, 5, first)
    assert score == pytest.approx(35 + 35 + 20 + 12, abs=0.01)
    assert tier == "EMERGENCY"


def test_tier_for_score_matches_thresholds():
    assert tier_for_score(80) == "EMERGENCY"
    assert tier_for_score(75) == "EMERGENCY"
    assert tier_for_score(60) == "HIGH"
    assert tier_for_score(30) == "MEDIUM"
    assert tier_for_score(10) == "LOW"
