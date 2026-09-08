"""GPS coordinate privacy fuzzing — pattern ported from City-Sync
`backend/utils/privacy_hash.py` (BUILD.md §2.3).

Reporter exact coordinates are sensitive. The map and public views only ever
receive fuzzed coordinates (±FUZZ_RADIUS_M snapped to a grid), while the
clustering engine works on the precise values stored server-side.
"""
import hashlib
import math

METERS_PER_DEG_LAT = 111_320.0


def fuzz_coordinates(
    latitude: float, longitude: float, fuzz_radius_m: float = 35.0
) -> tuple[float, float]:
    """Deterministic jitter within ±fuzz_radius_m so repeated views of the same
    report show the same (slightly shifted) pin — no oracle from re-fetching."""
    seed = hashlib.sha256(f"{latitude:.6f},{longitude:.6f}".encode()).digest()
    n = int.from_bytes(seed[:8], "big") / 2**64 - 0.5  # [-0.5, 0.5)
    angle = (int.from_bytes(seed[8:16], "big") / 2**64) * 2 * math.pi
    r = fuzz_radius_m * (0.5 + n) * 2  # 0..fuzz_radius_m
    d_lat = r * math.sin(angle) / METERS_PER_DEG_LAT
    d_lon = r * math.cos(angle) / (METERS_PER_DEG_LAT * math.cos(math.radians(latitude)))
    return round(latitude + d_lat, 6), round(longitude + d_lon, 6)


def privacy_hash(latitude: float, longitude: float, grid_m: float = 25.0) -> str:
    """Stable hash of a ~grid_m cell — links reports of the same spot without
    exposing exact coordinates."""
    cell_lat = math.floor(latitude * METERS_PER_DEG_LAT / grid_m)
    cell_lon = math.floor(
        longitude * METERS_PER_DEG_LAT * math.cos(math.radians(latitude)) / grid_m
    )
    digest = hashlib.sha256(f"{cell_lat}:{cell_lon}".encode()).hexdigest()
    return digest[:16]
