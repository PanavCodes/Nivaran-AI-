"""Indoor coordinate privacy hashing and deterministic jitter."""
import hashlib
import math


def fuzz_indoor_coordinates(
    x: float, y: float, fuzz_radius: float = 3.0
) -> tuple[float, float]:
    """Deterministic micro-jitter for public display."""
    seed = hashlib.sha256(f"{x:.2f},{y:.2f}".encode()).digest()
    n = int.from_bytes(seed[:8], "big") / 2**64 - 0.5
    angle = (int.from_bytes(seed[8:16], "big") / 2**64) * 2 * math.pi
    r = fuzz_radius * abs(n)
    return round(x + r * math.cos(angle), 1), round(y + r * math.sin(angle), 1)


def indoor_privacy_hash(floor: str, x: float, y: float, cell_size: float = 15.0) -> str:
    """Stable hash of a cell on a specific floor."""
    cell_x = math.floor(x / cell_size)
    cell_y = math.floor(y / cell_size)
    digest = hashlib.sha256(f"{floor.strip().upper()}:{cell_x}:{cell_y}".encode()).hexdigest()
    return digest[:16]
