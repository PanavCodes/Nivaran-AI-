"""Named SQL queries — BUILD.md §3.2 (verbatim spatio-semantic search) plus
supporting queries for nearby lookup and analytics. All executed database-native
via SQLAlchemy `text()`; never filter in Python."""
from sqlalchemy import text

# ─────────────────────────────────────────────────────────────────────────────
# SPATIO_SEMANTIC_SEARCH — BUILD.md §3.2 (verbatim). ① bounding-box pre-filter
# (~50 m ≈ 0.00045°) → ② exact Haversine check → ③ cosine similarity ≥ :threshold (0.52 calibrated).
# The similarity/distance knobs are also exposed via env (§5.3) by the
# clustering service, which interpolates them into RADIUS/THRESHOLD markers.
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
    latitude,
    longitude,
    (1 - (representative_embedding <=> :new_embedding)) AS semantic_similarity
FROM issue_clusters
WHERE
    category     = :new_category
    AND status  NOT IN ('RESOLVED', 'CLOSED')
    -- ① Spatial bounding-box pre-filter (~50 m, ~0.00045 degrees)
    AND latitude  BETWEEN (:new_lat - :bbox_deg) AND (:new_lat + :bbox_deg)
    AND longitude BETWEEN (:new_lon - :bbox_deg) AND (:new_lon + :bbox_deg)
    -- ② Exact Haversine distance check (Earth radius = 6 371 000 m)
    AND (6371000 * acos(LEAST(1.0,
        cos(radians(:new_lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(:new_lon)) +
        sin(radians(:new_lat)) * sin(radians(latitude))
    ))) <= :radius_m
    -- ③ Cosine similarity threshold (0.52 = empirically calibrated, see config.py)
    AND (1 - (representative_embedding <=> :new_embedding)) >= :threshold
ORDER BY semantic_similarity DESC
LIMIT 1
"""
)

# Nearby active clusters for the intake portal's floating sidebar (§1.1).
NEARBY_CLUSTERS = text(
    """
SELECT
    id AS cluster_id, title, category, status, priority_score,
    complaint_count, severity_score, impact_score, sla_deadline,
    latitude, longitude,
    (6371000 * acos(LEAST(1.0,
        cos(radians(:lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(:lon)) +
        sin(radians(:lat)) * sin(radians(latitude))
    ))) AS distance_m
FROM issue_clusters
WHERE status NOT IN ('RESOLVED', 'CLOSED')
  AND latitude  BETWEEN (:lat - :bbox_deg) AND (:lat + :bbox_deg)
  AND longitude BETWEEN (:lon - :bbox_deg) AND (:lon + :bbox_deg)
  AND (:q IS NULL OR title ILIKE ('%' || :q || '%') OR category::text ILIKE ('%' || :q || '%'))
ORDER BY distance_m ASC
LIMIT 10
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
