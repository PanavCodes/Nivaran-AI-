"""Explainable priority score — BUILD.md §3.4 (verbatim).

P = (S×7) + (min(10,R)×3.5) + (I×4) + (min(48,D)×0.25)  → 0–100 scale.
SLA tiers: EMERGENCY ≥75 (2h) · HIGH ≥50 (12h) · MEDIUM ≥25 (24h) · LOW (72h).
"""
from datetime import datetime, timedelta, timezone
import math


def compute_priority(
    severity: int,
    recurrence: int,
    impact: int,
    first_reported_at: datetime,
) -> tuple[float, str, datetime]:
    """Returns (priority_score, sla_tier, sla_deadline)."""
    now = datetime.now(timezone.utc)
    if first_reported_at.tzinfo is None:
        first_reported_at = first_reported_at.replace(tzinfo=timezone.utc)
    duration_hours = (now - first_reported_at).total_seconds() / 3600

    S = max(1, min(5, severity))
    R = min(10, recurrence)
    I = max(1, min(5, impact))
    D = min(48, duration_hours)

    P = (S * 7) + (R * 3.5) + (I * 4) + (D * 0.25)

    SLA_MAP = {
        "EMERGENCY": (75, 2),
        "HIGH":      (50, 12),
        "MEDIUM":    (25, 24),
        "LOW":       (0,  72),
    }
    tier, hours = next(
        (t, h) for t, (threshold, h) in SLA_MAP.items() if P >= threshold
    )
    deadline = now + timedelta(hours=hours)
    return round(P, 2), tier, deadline


def tier_for_score(priority_score: float) -> str:
    """Tier lookup for existing clusters (same thresholds as compute_priority)."""
    if priority_score >= 75:
        return "EMERGENCY"
    if priority_score >= 50:
        return "HIGH"
    if priority_score >= 25:
        return "MEDIUM"
    return "LOW"


# Colour tokens — BUILD.md §1 (used by frontend map markers too).
TIER_COLORS = {
    "EMERGENCY": "#FF3B30",
    "HIGH": "#FFCC00",
    "MEDIUM": "#FF9500",
    "LOW": "#34C759",
}
