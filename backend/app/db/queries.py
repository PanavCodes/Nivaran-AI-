"""Named SQL queries — BUILD.md §3.2 (verbatim spatio-semantic search) plus
supporting queries for nearby lookup and analytics. All executed database-native
via SQLAlchemy `text()`; never filter in Python."""
from sqlalchemy import text

# ─────────────────────────────────────────────────────────────────────────────
# SPATIO_SEMANTIC_SEARCH — Indoor Floor-Aware Spatial + Semantic Search:
# ① floor match (must be on the same floor)
# ② bounding box pre-filter in SVG canvas units
# ③ exact 2D Euclidean distance check (<= :radius_units)
# ④ cosine similarity >= :threshold (0.52 calibrated)
# ─────────────────────────────────────────────────────────────────────────────
SPATIO_SEMANTIC_SEARCH = text(
    """
SELECT
    id              AS cluster_id,
    title,
    category,
    status,
    priority_score,
    complaint_count,
    severity_score,
    impact_score,
    sla_deadline,
    floor,
    x_coord,
    y_coord,
    room_or_zone,
    (1 - (representative_embedding <=> :new_embedding)) AS semantic_similarity
FROM issue_clusters
WHERE
    category     = :new_category
    AND status  NOT IN ('RESOLVED', 'CLOSED')
    -- ① Indoor floor boundary (must match the exact floor)
    AND floor    = :new_floor
    -- ② 2D bounding-box pre-filter in canvas units
    AND x_coord BETWEEN (:new_x - :radius_units) AND (:new_x + :radius_units)
    AND y_coord BETWEEN (:new_y - :radius_units) AND (:new_y + :radius_units)
    -- ③ Exact 2D Euclidean distance check
    AND sqrt(power(x_coord - :new_x, 2) + power(y_coord - :new_y, 2)) <= :radius_units
    -- ④ Cosine similarity threshold (0.52 = empirically calibrated)
    AND (1 - (representative_embedding <=> :new_embedding)) >= :threshold
ORDER BY semantic_similarity DESC
LIMIT 1
"""
)

# Nearby active clusters on the current floor for the intake portal (§1.1).
NEARBY_CLUSTERS = text(
    """
SELECT
    id AS cluster_id, title, category, status, priority_score,
    complaint_count, severity_score, impact_score, sla_deadline,
    floor, x_coord, y_coord, room_or_zone,
    round(cast(sqrt(power(x_coord - :x, 2) + power(y_coord - :y, 2)) as numeric), 1) AS distance_units
FROM issue_clusters
WHERE status NOT IN ('RESOLVED', 'CLOSED')
  AND floor = :floor
  AND (cast(:q as text) IS NULL OR title ILIKE ('%' || cast(:q as text) || '%') OR category::text ILIKE ('%' || cast(:q as text) || '%') OR room_or_zone ILIKE ('%' || cast(:q as text) || '%'))
ORDER BY distance_units ASC
LIMIT 10
"""
)

FLOOR_INCIDENT_SUMMARY = text(
    """
SELECT
    floor,
    COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED')) AS open_count,
    COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED') AND priority_score >= 75) AS emergency_count,
    COALESCE(MAX(priority_score) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED')), 0) AS max_priority
FROM issue_clusters
GROUP BY floor
"""
)

# Admin KPI row (§1.2 Analytics).
ANALYTICS_KPI = text(
    """
SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED')) AS open_clusters,
    COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - first_reported_at)) / 3600)
             FILTER (WHERE status IN ('RESOLVED', 'CLOSED')), 0) AS avg_resolution_hours,
    COALESCE(
        100.0 * COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED') AND updated_at > sla_deadline)
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('RESOLVED','CLOSED')), 0), 0) AS sla_breach_rate
FROM issue_clusters
"""
)

TOP_CATEGORY = text(
    """
SELECT category::text AS category, COUNT(*) AS n
FROM issue_clusters
WHERE status NOT IN ('RESOLVED', 'CLOSED')
GROUP BY category
ORDER BY n DESC
LIMIT 1
"""
)
