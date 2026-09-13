"""Embedding pipeline — BUILD.md Day 2 Step 2 (verbatim).

all-MiniLM-L6-v2: 384-dim, ~80MB, CPU-friendly. Model loads lazily and is
preloaded during app lifespan so the first complaint isn't slow.
"""
from __future__ import annotations

import hashlib
import threading

import numpy as np
from loguru import logger

from app.core.config import settings

_model = None
_lock = threading.Lock()


def _mock_embed(text: str) -> list[float]:
    """Deterministic, normalized 384-dimensional pseudo-embedding for MOCK_AI / offline mode."""
    import re

    vec = np.zeros(384, dtype=np.float32)
    words = re.findall(r"\w+", text.lower())
    if not words:
        words = ["empty"]
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16) % 384
        vec[h] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    else:
        vec[0] = 1.0
    return vec.tolist()


def get_model():
    global _model
    if settings.MOCK_AI:
        return None
    if _model is None:
        with _lock:
            if _model is None:  # double-checked load
                try:
                    from sentence_transformers import SentenceTransformer

                    logger.info(f"Loading embedding model {settings.EMBEDDING_MODEL_NAME}…")
                    _model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                    logger.success("Embedding model ready")
                except Exception as exc:
                    logger.warning(f"SentenceTransformer not available ({exc}), using mock embeddings")
                    _model = None
    return _model


def embed(text: str) -> list[float]:
    model = get_model()
    if model is not None:
        try:
            vec = model.encode(text, normalize_embeddings=True)
            return vec.tolist()
        except Exception as exc:
            logger.warning(f"Embedding model encode failed ({exc}), using mock fallback")
    return _mock_embed(text)


def blend(existing: list[float], new: list[float], weight: float = 0.3) -> list[float]:
    """Weighted running average to update cluster representative embedding."""
    e = np.array(existing)
    n = np.array(new)
    blended = ((1 - weight) * e + weight * n)
    norm = np.linalg.norm(blended)
    if norm > 0:
        blended /= norm  # re-normalise
    else:
        # Fallback: uniform unit vector to avoid NaN in pgvector cosine index
        blended = np.ones(len(blended), dtype=np.float32) / np.sqrt(len(blended))
    return blended.tolist()

