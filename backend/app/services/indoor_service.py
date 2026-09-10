"""Indoor location service — resolves indoor rooms and floor plan metadata."""
import json
import math
from pathlib import Path
from loguru import logger

_DATA_FILE = Path(__file__).resolve().parent.parent / "core" / "campus_floors.json"
_ROOMS_BY_FLOOR: dict[str, list[dict]] = {}

if _DATA_FILE.exists():
    try:
        _ROOMS_BY_FLOOR = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning(f"Failed loading campus_floors.json: {exc}")


def get_floor_rooms(floor: str) -> list[dict]:
    return _ROOMS_BY_FLOOR.get(floor.upper(), [])


def resolve_indoor_location(floor: str, x: float, y: float) -> str:
    """Finds the nearest room on the specified floor or returns coordinate label."""
    norm_floor = floor.upper()
    rooms = get_floor_rooms(norm_floor)
    if not rooms:
        return f"Floor {norm_floor} ({x:.1f}, {y:.1f})"

    closest = None
    min_dist = float("inf")
    for r in rooms:
        d = math.hypot(r["x"] - x, r["y"] - y)
        if d < min_dist:
            min_dist = d
            closest = r

    if closest and min_dist <= 60.0:
        return f"Floor {norm_floor} · {closest['name']}"
    return f"Floor {norm_floor} · Area near ({int(x)}, {int(y)})"
