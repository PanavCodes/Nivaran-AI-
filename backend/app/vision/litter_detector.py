"""YOLO waste-density hook — ported from jeremy-rico/litter-detection
(BUILD.md §2.3): rough waste-coverage estimate for HOUSEKEEPING complaints.

Uses ultralytics YOLO when installed with a locally available model file
(settings.LITTER_MODEL_PATH). Never blocks the intake pipeline — without the
model it degrades to `{"available": false}`.
"""
from functools import lru_cache
from pathlib import Path

import numpy as np
from loguru import logger

from app.core.config import settings


@lru_cache
def _load_model():
    try:
        from ultralytics import YOLO

        path = Path(settings.LITTER_MODEL_PATH)
        if not path.exists():
            logger.info(f"Litter model not found at {path} — density hook disabled")
            return None
        logger.info(f"Loading litter detection model {path}…")
        return YOLO(str(path))
    except ImportError:
        logger.info("ultralytics not installed — litter density hook disabled")
        return None
    except Exception as exc:
        logger.warning(f"Litter model load failed: {exc}")
        return None


def detect_waste_density(image_bytes: bytes) -> dict:
    """Estimate waste coverage (0–1) and detected-object count in a photo."""
    model = _load_model()
    if model is None:
        return {"available": False}

    try:
        import cv2

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"available": False}

        results = model.predict(img, verbose=False)
        img_area = float(img.shape[0] * img.shape[1])
        covered = 0.0
        detections = 0
        for r in results:
            boxes = getattr(r, "boxes", None)
            if boxes is None:
                continue
            detections += len(boxes)
            for b in boxes.xyxy.tolist():
                x1, y1, x2, y2 = b
                covered += max(0.0, x2 - x1) * max(0.0, y2 - y1)

        density = min(1.0, covered / img_area) if img_area else 0.0
        level = "high" if density >= 0.15 else "medium" if density >= 0.05 else "low"
        return {
            "available": True,
            "density": round(density, 3),
            "level": level,
            "detections": detections,
        }
    except Exception as exc:
        logger.debug(f"Waste density estimation failed: {exc}")
        return {"available": False}
