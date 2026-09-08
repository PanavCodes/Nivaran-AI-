"""Image damage grading — pattern ported from FixMyStreet/Endgame
`backend/vision/damage_grader.py` (BUILD.md §2.3): OpenCV edge-density and
darkness heuristics that score visible structural damage 0–1.

OpenCV is optional at runtime — without it the grader degrades to
`{"grade": "unknown"}` instead of breaking the intake pipeline.
"""
import base64
import binascii

import numpy as np
from loguru import logger

GRADES = ("none", "minor", "moderate", "severe")


def _decode(image_bytes: bytes) -> "np.ndarray | None":
    try:
        import cv2

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img if img is not None and img.size > 0 else None
    except ImportError:
        return None
    except Exception as exc:
        logger.debug(f"Damage decode failed: {exc}")
        return None


def grade_damage(image_bytes: bytes) -> dict:
    """Score 0–1 damage intensity + qualitative grade for a report photo.

    Heuristic (from Endgame): damage correlates with high-frequency edge
    density (cracks/tears/debris) and local darkness variance (water stains,
    flooding shadows).
    """
    img = _decode(image_bytes)
    if img is None:
        # No OpenCV / undecodable image — never block intake
        return {"grade": "unknown", "score": None, "reasoning": "opencv_unavailable"}

    import cv2

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 60, 160)
    edge_density = float(np.count_nonzero(edges)) / float(edges.size)

    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray)) / 255.0

    # Weighted combination, normalised to ~0–1
    score = min(1.0, edge_density * 6.0 + min(laplacian_var, 800.0) / 1600.0 + (0.5 - min(brightness, 0.5)))
    if score >= 0.55:
        grade = "severe"
    elif score >= 0.35:
        grade = "moderate"
    elif score >= 0.18:
        grade = "minor"
    else:
        grade = "none"

    return {
        "grade": grade,
        "score": round(score, 3),
        "edge_density": round(edge_density, 4),
        "brightness": round(brightness, 3),
    }


def grade_to_severity_hint(grade: str | None) -> int | None:
    """Map an image damage grade onto the 1–5 severity scale used by the
    priority formula (§3.4). Returned as a *hint* — Gemini's rating wins."""
    return {"severe": 5, "moderate": 4, "minor": 2, "none": 1}.get(grade or "")


def is_probably_image(image_bytes: bytes) -> bool:
    """Cheap magic-byte sniff (JPEG/PNG) so callers can skip non-images."""
    if not image_bytes or len(image_bytes) < 12:
        return False
    jpeg = image_bytes[:3] == b"\xff\xd8\xff"
    png = image_bytes[:8] == b"\x89PNG\r\n\x1a\n"
    if jpeg or png:
        return True
    try:  # data-URL fallback
        head = base64.b64decode(image_bytes[:32] + b"==", validate=False)[:4]
        return head[:3] == b"\xff\xd8\xff" or head == b"\x89PNG"
    except (binascii.Error, ValueError):
        return False
