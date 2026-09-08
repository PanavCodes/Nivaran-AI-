"""Unit tests for the tier2 utility ports — BUILD.md §2.3
(Community_Compliance geofencing + City-Sync privacy_hash)."""
import math

from app.utils.geofencing import bbox_degrees, haversine_m, within_radius_m
from app.utils.privacy_hash import fuzz_coordinates, privacy_hash


def test_haversine_zero_distance():
    assert haversine_m(18.9220, 72.8347, 18.9220, 72.8347) == 0.0


def test_haversine_known_distance():
    # One degree of latitude on the spherical BUILD.md Earth (R = 6 371 000 m)
    # is R·π/180 ≈ 111 194.93 m.
    d = haversine_m(18.0, 72.0, 19.0, 72.0)
    assert abs(d - 111_194.93) < 10


def test_merge_radius_gate():
    # ~12 m apart — inside the 50 m clustering radius (judge demo §6.3)
    a = (18.9220, 72.8347)
    b = (18.9220 + 12.0 / 111_320, 72.8347)
    assert within_radius_m(*a, *b, radius_m=50.0)
    # ~110 m apart — outside
    c = (18.9220 + 110.0 / 111_320, 72.8347)
    assert not within_radius_m(*a, *c, radius_m=50.0)


def test_bbox_matches_build_md_constant():
    assert abs(bbox_degrees(50) - 0.00045) < 1e-9


def test_fuzz_is_deterministic_and_bounded():
    f1 = fuzz_coordinates(18.9220, 72.8347)
    f2 = fuzz_coordinates(18.9220, 72.8347)
    assert f1 == f2  # same input → same jitter (no re-fetch oracle)
    lat, lon = f1
    # jitter stays within ±40 m for the default 35 m radius
    assert abs(lat - 18.9220) * 111_320 < 40
    assert abs(lon - 72.8347) * 111_320 * math.cos(math.radians(18.9220)) < 40


def test_privacy_hash_stable_within_cell():
    a = privacy_hash(18.9220, 72.8347)
    b = privacy_hash(18.92201, 72.83471)  # same ~25 m cell
    c = privacy_hash(18.9250, 72.8400)  # different cell entirely
    assert a == b
    assert a != c
    assert len(a) == 16
