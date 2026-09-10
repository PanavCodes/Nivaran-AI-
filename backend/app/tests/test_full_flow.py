"""Full-stack smoke test — BUILD.md Day 4 Step 2.

Runs the entire judge-demo narrative against a LIVE backend (FastAPI running
on localhost:8000 with a seeded/empty database):

    ✅ Student intake → ✅ Cluster merge → ✅ Priority escalation →
    ✅ Technician resolve

Usage:
    # terminal 1
    cd backend && .venv/Scripts/python -m uvicorn app.main:app
    # terminal 2
    cd backend && .venv/Scripts/python app/tests/test_full_flow.py
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

import httpx

BASE = "http://localhost:8000"
STEPS = ["✅ Student intake", "✅ Cluster merge", "✅ Priority escalation", "✅ Technician resolve"]

ok_steps: list[str] = []


def fail(msg: str) -> None:
    print(f"❌ {msg}")
    sys.exit(1)


def run_offset(suffix: str) -> tuple[str, float, float]:
    """Per-run unique floor & canvas coordinates so reruns never clash with previous runs."""
    seed = int(suffix[:4], 16) if len(suffix) >= 4 else abs(hash(suffix)) % 65536
    floor = "1"
    x = 100.0 + (seed % 80)
    y = 150.0 + ((seed >> 4) % 150)
    return floor, round(x, 1), round(y, 1)


def register(client: httpx.Client, role: str, suffix: str) -> dict:
    email = f"flow-{role}-{suffix}@nivaran.test"
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Flow@12345",
            "full_name": f"Flow {role}",
            "role": role,
            "department": "QA",
        },
    )
    if r.status_code == 409:  # rerun against a warm DB
        r = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Flow@12345"},
        )
    assert r.status_code in (200, 201), r.text
    return r.json()


def main() -> None:
    suffix = uuid.uuid4().hex[:8]
    floor, x_coord, y_coord = run_offset(suffix)
    with httpx.Client(base_url=BASE, timeout=30) as client:
        health = client.get("/health").json()
        print(f"health: {health['status']} (pgvector={health['database']['pgvector_extension']})")

        student = register(client, "STUDENT", suffix)
        student2 = register(client, "STUDENT", suffix + "b")
        tech = register(client, "TECHNICIAN", suffix)
        admin = register(client, "ADMIN", suffix)
        s1 = {"Authorization": f"Bearer {student['access_token']}"}
        s2 = {"Authorization": f"Bearer {student2['access_token']}"}
        tk = {"Authorization": f"Bearer {tech['access_token']}"}
        ad = {"Authorization": f"Bearer {admin['access_token']}"}

        # ── 1. Student intake ────────────────────────────────────────────
        r = client.post(
            "/api/v1/complaints",
            headers=s1,
            data={
                "title": "Leaking pipe near Faculty Area 102",
                "description": "Corridor ceiling pipe near Faculty Area 102 has a severe water leak spreading towards faculty cubicles.",
                "floor": floor,
                "x_coord": str(x_coord),
                "y_coord": str(y_coord),
                "room_or_zone": "Faculty Area 102",
            },
        )
        if r.status_code != 200:
            fail(f"intake failed: {r.status_code} {r.text}")
        first = r.json()
        assert first["merged"] is False, "first report must create a fresh cluster"
        cluster_id = first["cluster_id"]
        ok_steps.append(STEPS[0])
        print(" ".join(ok_steps), f"→ cluster {cluster_id[:8]} P={first['priority_score']} on Floor {first['floor']}")

        # ── 2. Cluster merge (second student, ±5 canvas units, same story) ─────────
        r = client.post(
            "/api/v1/complaints",
            headers=s2,
            data={
                "title": "Slippery floor in corridor near 102",
                "description": "The floor outside Faculty Area 102 is completely flooded with dripping ceiling water. Faculty members are slipping.",
                "floor": floor,
                "x_coord": str(x_coord + 4.0),
                "y_coord": str(y_coord + 3.0),
                "room_or_zone": "Faculty Area 102",
            },
        )
        if r.status_code != 200:
            fail(f"merge failed: {r.status_code} {r.text}")
        second = r.json()
        if not second["merged"]:
            fail(
                "expected the second report to merge into the existing cluster "
                f"(got merged={second['merged']}, category={second['category']})"
            )
        assert second["cluster_id"] == cluster_id
        assert second["complaint_count"] == 2
        ok_steps.append(STEPS[1])
        print(" ".join(ok_steps), f"→ count=2 P={second['priority_score']}")

        # ── 3. Priority escalation (merge must raise the score) ──────────
        if not second["priority_score"] > first["priority_score"]:
            fail(f"priority did not escalate: {first['priority_score']} → {second['priority_score']}")
        detail = client.get(f"/api/v1/clusters/{cluster_id}", headers=ad).json()
        assert detail["complaint_count"] == 2
        assert len(detail["complaints"]) == 2
        ok_steps.append(STEPS[2])
        print(" ".join(ok_steps), f"→ tier={detail['sla_tier']} score={detail['priority_score']}")

        # ── 4. Technician resolve (dual-proof) ───────────────────────────
        r = client.post(
            f"/api/v1/clusters/{cluster_id}/status",
            headers=tk,
            json={"status": "IN_PROGRESS"},
        )
        assert r.status_code == 200, r.text
        proof = Path(__file__).with_name("assets") / "proof_placeholder.jpg"
        if not proof.exists():
            # 1×1 JPEG — enough for MOCK_AI path and multipart plumbing
            proof.write_bytes(
                b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00"
                b"\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07"
                b"\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f"
                b"\x14\x1d\x1a\x1f\x1e\x1c\x1a\x1c\x1e\x22\x25\x28\x22\x1e\x24"
                b"\x21\x26\x1e\x21\x22\x24\xff\xc0\x00\x0b\x08\x00\x01\x00\x01"
                b"\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01"
                b"\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04"
                b"\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01"
                b"\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03"
                b"\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07\"q\x142\x81\x91\xa1"
                b"\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x0e\x0f\x10\x11\x12"
                b"\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f\x1f"
                b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd2\x8a(\xa5"
                b"\x14\x52\x8a(\xa5\x14\x52\x8a(\xa5\x14\xff\xd9"
            )
        r = client.post(
            f"/api/v1/clusters/{cluster_id}/resolve",
            headers=tk,
            data={"technician_notes": "Pipe clamped, floor dried."},
            files={"proof_image": ("proof.jpg", proof.read_bytes(), "image/jpeg")},
        )
        if r.status_code != 200:
            fail(f"resolve failed: {r.status_code} {r.text}")
        resolved = r.json()
        if not resolved["verified"]:
            fail(f"dual-proof rejected: {resolved['reasoning']}")
        assert resolved["status"] == "RESOLVED"
        audit = client.get(f"/api/v1/clusters/{cluster_id}/audit", headers=ad).json()
        actions = {a["action_taken"] for a in audit}
        assert "CLUSTER_RESOLVED" in actions and "EN_ROUTE" in actions
        ok_steps.append(STEPS[3])
        print(
            " ".join(ok_steps),
            f"→ similarity={resolved['similarity_score']} audit={sorted(actions)}",
        )
        print("\n✅ Student intake → ✅ Cluster merge → ✅ Priority escalation → ✅ Technician resolve")


if __name__ == "__main__":
    main()
