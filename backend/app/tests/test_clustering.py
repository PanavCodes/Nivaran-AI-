"""Clustering service unit tests — BUILD.md Day 2 gate.

Embedding model is loaded once (real all-MiniLM-L6-v2, local CPU). These
tests validate the merge/create decision logic with a mocked DB-free path
via the mock pipeline helpers."""
import math

import numpy as np

from app.services.embedding_service import blend, embed
from app.services.clustering_service import CATEGORY_DEPARTMENT_MAP


def test_embed_is_384_dim_and_normalised():
    vec = embed("Leaking pipe in library corridor causing flooding")
    assert len(vec) == 384
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-6


def test_similar_texts_score_above_merge_threshold():
    a = embed("Water leaking from pipe in library hallway, floor is wet")
    b = embed("The hallway floor in the library is completely wet due to water dripping from the ceiling")
    sim = float(np.dot(a, b))
    assert sim >= 0.52, f"expected similarity >= 0.52, got {sim:.3f}"


def test_different_categories_dissimilar():
    a = embed("Wifi not working in computer lab")
    b = embed("Garbage not collected near canteen dustbin")
    sim = float(np.dot(a, b))
    assert sim < 0.52


def test_blend_keeps_unit_norm_and_weights():
    existing = embed("Leaking pipe in library")
    new = embed("Ceiling dripping water in library corridor")
    blended = blend(existing, new, weight=0.3)
    assert abs(np.linalg.norm(blended) - 1.0) < 1e-6
    # 70% existing / 30% new direction preserved
    manual = (1 - 0.3) * np.array(existing) + 0.3 * np.array(new)
    manual = manual / np.linalg.norm(manual)
    assert np.allclose(blended, manual, atol=1e-6)


def test_category_department_map_complete():
    from app.db.models import ISSUE_CATEGORIES

    assert set(CATEGORY_DEPARTMENT_MAP) == set(ISSUE_CATEGORIES)
