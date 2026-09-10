"""Unit tests for indoor spatial utilities: 2D Euclidean distance and privacy."""
import math

from app.utils.geofencing import euclidean_distance, within_indoor_radius
from app.utils.privacy_hash import fuzz_indoor_coordinates, indoor_privacy_hash


def test_euclidean_zero_distance():
    assert euclidean_distance(100.0, 200.0, 100.0, 200.0) == 0.0


def test_euclidean_known_345_triangle():
    # 30-40-50 right triangle
    d = euclidean_distance(100.0, 200.0, 130.0, 240.0)
    assert abs(d - 50.0) < 1e-6


def test_within_indoor_radius_same_floor():
    # Points 20 units apart on Floor 1 (within 35 units threshold)
    assert within_indoor_radius("1", 100.0, 200.0, "1", 112.0, 216.0, radius_units=35.0)

    # Points 60 units apart on Floor 1 (outside 35 units threshold)
    assert not within_indoor_radius("1", 100.0, 200.0, "1", 150.0, 240.0, radius_units=35.0)


def test_different_floors_never_within_radius():
    # Identical (x, y) coordinates on Floor 1 vs Floor 3 must NEVER merge!
    assert not within_indoor_radius("1", 100.0, 200.0, "3", 100.0, 200.0, radius_units=35.0)
    # Ground vs Lower Ground
    assert not within_indoor_radius("G", 50.0, 50.0, "LG", 50.0, 50.0, radius_units=35.0)


def test_fuzz_is_deterministic_and_bounded():
    f1 = fuzz_indoor_coordinates(150.0, 250.0)
    f2 = fuzz_indoor_coordinates(150.0, 250.0)
    assert f1 == f2  # deterministic jitter
    x, y = f1
    assert abs(x - 150.0) <= 3.5
    assert abs(y - 250.0) <= 3.5


def test_indoor_privacy_hash_stable_within_cell():
    a = indoor_privacy_hash("1", 150.0, 250.0)
    b = indoor_privacy_hash("1", 152.0, 251.0)  # same cell on Floor 1
    c = indoor_privacy_hash("1", 200.0, 350.0)  # different cell on Floor 1
    d = indoor_privacy_hash("2", 150.0, 250.0)  # same (x,y) but on Floor 2!

    assert a == b
    assert a != c
    assert a != d
    assert len(a) == 16
