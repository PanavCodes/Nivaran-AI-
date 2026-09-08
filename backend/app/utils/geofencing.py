"""Geofencing utilities — pattern ported from Community_Compliance
`backend/utils/geofencing.py` (BUILD.md §2.3): Haversine distance and radius
checks. The DB-native spatio-semantic query (§3.2) remains the authority for
clustering; these helpers serve Python-side checks and unit tests."""
import math

EARTH_RADIUS_M = 6_371_000  # BUILD.md §3.2 constant


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres (same formula as the SQL query)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def within_radius_m(
    lat1: float, lon1: float, lat2: float, lon2: float, radius_m: float = 50.0
) -> bool:
    """True when two coordinate pairs fall inside the clustering radius."""
    return haversine_m(lat1, lon1, lat2, lon2) <= radius_m


def bbox_degrees(radius_m: float) -> float:
    """Bounding-box half-width in degrees for the SQL pre-filter (§3.2:
    50 m ≈ 0.00045°)."""
    return radius_m * 0.000009
