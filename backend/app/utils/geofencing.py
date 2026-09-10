"""Indoor spatial utilities: 2D Euclidean distance and floor boundary checks."""
import math


def euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Calculates 2D planar distance on the SVG canvas coordinate plane."""
    return math.hypot(x2 - x1, y2 - y1)


def within_indoor_radius(
    floor1: str,
    x1: float,
    y1: float,
    floor2: str,
    x2: float,
    y2: float,
    radius_units: float = 35.0,
) -> bool:
    """Returns True if both points are on the exact same floor AND within radius_units."""
    if floor1.strip().upper() != floor2.strip().upper():
        return False
    return euclidean_distance(x1, y1, x2, y2) <= radius_units
