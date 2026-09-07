"""Embedding pipeline — BUILD.md Day 2 Step 2 (verbatim).

all-MiniLM-L6-v2: 384-dim, ~80MB, CPU-friendly. Model loads lazily and is
preloaded during app lifespan so the first complaint isn't slow.
"""
from __future__ import annotations

import threading

import numpy as np
from loguru import logger

from app.core.config import settings

_model = None
_lock = threading.Lock()


def get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:  # double-checked load
                from sentence_transformers import SentenceTransformer

                logger.info(f"Loading embedding model {settings.EMBEDDING_MODEL_NAME}…")
                _model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                logger.success("Embedding model ready")
    return _model


def embed(text: str) -> list[float]:
    vec = get_model().encode(text, normalize_embeddings=True)
    return vec.tolist()


def blend(existing: list[float], new: list[float], weight: float = 0.3) -> list[float]:
    """Weighted running average to update cluster representative embedding."""
    e = np.array(existing)
    n = np.array(new)
    blended = ((1 - weight) * e + weight * n)
    blended /= np.linalg.norm(blended)  # re-normalise
    return blended.tolist()
