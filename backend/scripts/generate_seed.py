"""Generate backend/db/seed.sql — Indoor Campus Multi-Floor Architecture.

Produces 30+ geographically-clustered demo complaints across indoor floors
(LG, G, 1, 3, 4, 5, 8) mapped to exact SVG coordinates and rooms, with real
all-MiniLM-L6-v2 embeddings so HNSW and indoor clustering behave like production.

Usage:
    cd backend
    .venv/Scripts/python scripts/generate_seed.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bcrypt

from app.services.embedding_service import embed
from app.services.priority_service import compute_priority

OUT_PATH = Path(__file__).resolve().parents[1] / "db" / "seed.sql"

NOW = datetime.now(timezone.utc)

USERS = [
    # (email, password, full_name, role, department)
    ("admin@nivaran.edu", "Admin@123", "Campus Admin", "ADMIN", "Administration"),
    ("faculty@nivaran.edu", "Faculty@123", "Dr. Meera Sharma", "FACULTY", "Computer Science"),
    ("tech.maintenance@nivaran.edu", "Tech@123", "Ramesh Kumar", "TECHNICIAN", "Civil & Electrical Maintenance"),
    ("tech.it@nivaran.edu", "Tech@123", "Arun Verma", "TECHNICIAN", "IT Services"),
    ("tech.housekeeping@nivaran.edu", "Tech@123", "Sunita Devi", "TECHNICIAN", "Sanitation & Housekeeping"),
    ("student1@nivaran.edu", "Student@123", "Aarav Patel", "STUDENT", "Computer Science"),
    ("student2@nivaran.edu", "Student@123", "Diya Gupta", "STUDENT", "Electronics"),
    ("student3@nivaran.edu", "Student@123", "Rohan Singh", "STUDENT", "Mechanical"),
    ("student4@nivaran.edu", "Student@123", "Ishita Rao", "STUDENT", "Civil"),
    ("student5@nivaran.edu", "Student@123", "Kabir Mehta", "STUDENT", "Mathematics"),
    ("student6@nivaran.edu", "Student@123", "Ananya Iyer", "STUDENT", "Physics"),
]

INDOOR_CLUSTERS = [
    {
        "title": "Hardware Lab 1 projector & AC malfunction",
        "category": "IT_SUPPORT",
        "severity": 4, "impact": 4,
        "floor": "1",
        "x": 245.0, "y": 492.0,
        "room_or_zone": "Hardware Lab 1",
        "department": "IT Services",
        "hours_ago": 3,
        "complaints": [
            ("Projector bulb dead in Lab 1", "The ceiling-mounted HDMI projector in Hardware Lab 1 does not display anything and flashes red bulb error."),
            ("Hardware Lab 1 display down", "Cannot conduct afternoon lecture in Hardware Lab 1 because the projector screen remains blank despite rebooting."),
            ("AC dripping over server rack in Lab 1", "The split AC unit right above equipment rack in Hardware Lab 1 is leaking water down the wall."),
            ("Workstation 4 video signal lost", "Workstation 4 in Hardware Lab 1 has no video output to the display monitor."),
        ],
    },
    {
        "title": "Leaking pipe near Faculty Area 102",
        "category": "MAINTENANCE",
        "severity": 4, "impact": 4,
        "floor": "1",
        "x": 66.0, "y": 41.0,
        "room_or_zone": "Faculty Area 102",
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 2,
        "complaints": [
            ("Water leak near Faculty Area 102", "Corridor ceiling pipe near Faculty Area 102 has a severe water leak spreading towards faculty cubicles."),
            ("Slippery floor in 1st floor corridor", "The floor outside Faculty Area 102 is completely flooded with dripping ceiling water. Faculty members are slipping."),
            ("Ceiling tiles soaked near 102", "Damp water stains on ceiling tiles outside 102 corridor; two ceiling panels are sagging dangerously."),
            ("Water dripping into faculty cabin", "Water from the corridor leak has started seeping under the door into cabin 102B."),
        ],
    },
    {
        "title": "Main breaker tripping in Electrical Panel Room",
        "category": "MAINTENANCE",
        "severity": 5, "impact": 5,
        "floor": "LG",
        "x": 162.0, "y": 492.0,
        "room_or_zone": "Electrical Panel Room",
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 5,
        "complaints": [
            ("Sparks from main breaker panel", "Audible sparks and humming sound coming from secondary distribution breaker in LG Electrical Panel Room."),
            ("Power fluctuating in lower ground wing", "Frequent voltage drops and brownouts affecting lower ground laboratories. Burning insulation smell near panel."),
            ("Panel room breaker tripped again", "The 415V main feeder breaker in Electrical Panel Room tripped twice today during load ramp."),
        ],
    },
    {
        "title": "Clogged floor drain and stagnation in LG Pantry",
        "category": "HOUSEKEEPING",
        "severity": 4, "impact": 4,
        "floor": "LG",
        "x": 100.0, "y": 500.0,
        "room_or_zone": "Pantry",
        "department": "Sanitation & Housekeeping",
        "hours_ago": 12,
        "complaints": [
            ("Pantry drain backing up", "The floor drain inside the Lower Ground pantry is completely clogged with grease and water is overflowing."),
            ("Foul sewage odor in LG service corridor", "Stagnant wastewater pooling around LG pantry exit causing unbearable stench across the hallway."),
            ("Pantry sink blocked since morning", "Staff cannot wash utensils because dirty water is pooling 3 inches deep on the pantry tiles."),
        ],
    },
    {
        "title": "Central Campus Server Room AC failure",
        "category": "IT_SUPPORT",
        "severity": 5, "impact": 5,
        "floor": "G",
        "x": 180.0, "y": 40.0,
        "room_or_zone": "Server Room",
        "department": "IT Services",
        "hours_ago": 1,
        "complaints": [
            ("Server room ambient temperature critical", "Precision AC unit #2 in Ground Floor Server Room stopped working. Ambient temp reached 39 degrees."),
            ("Thermal alarm sounding in Server Room", "Audible high-temp buzzer activated inside the core rack area on Ground Floor."),
            ("Cooling compressor tripped", "The primary condenser on the ground floor server room cooling loop is locked out."),
        ],
    },
    {
        "title": "Broken door hinge and lock in AMU Room 1",
        "category": "FACILITIES",
        "severity": 3, "impact": 3,
        "floor": "G",
        "x": 40.0, "y": 41.0,
        "room_or_zone": "AMU Room 1",
        "department": "Campus Estate Office",
        "hours_ago": 18,
        "complaints": [
            ("AMU Room 1 door will not latch", "The heavy wooden entrance door to AMU Room 1 on Ground Floor is misaligned and cannot be locked."),
            ("Door handle came off AMU 1", "Students cannot open the door from the inside because the latch mechanism came loose."),
            ("Door scrapes bottom frame", "The hinge screws have stripped causing the door to drag loudly against the ground floor tiles."),
        ],
    },
    {
        "title": "Power socket sparks in Faculty Area 301",
        "category": "MAINTENANCE",
        "severity": 4, "impact": 3,
        "floor": "3",
        "x": 294.0, "y": 41.0,
        "room_or_zone": "Faculty Area 301",
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 15,
        "complaints": [
            ("Electrical spark from cubicle socket", "A professor plugged in their charger in Faculty Area 301 and a loud pop with visible sparks occurred."),
            ("Charred wall outlet in Area 301", "The dual switch socket on the west wall of 301 has blackened plastic and smells of electrical burning."),
            ("Cubicle power rail dead", "The entire bank of 4 desks in 301 lost power after the short circuit."),
        ],
    },
    {
        "title": "Audio feedback and mic failure in E. CR 302",
        "category": "IT_SUPPORT",
        "severity": 3, "impact": 4,
        "floor": "3",
        "x": 40.0, "y": 492.0,
        "room_or_zone": "E. CR 302",
        "department": "IT Services",
        "hours_ago": 28,
        "complaints": [
            ("Microphone screeching in Room 302", "The PA amplifier in 3rd floor classroom 302 produces continuous high-pitch screeching during lectures."),
            ("Wireless lapel mic dead in 302", "The receiver unit on the podium has no power indicator and batteries were replaced without effect."),
            ("Ceiling speakers crackling", "Right side ceiling speaker in E. CR 302 crackles loudly making lectures unintelligible in the back."),
        ],
    },
    {
        "title": "Central Lift stalled between Floor 4 and 5",
        "category": "MAINTENANCE",
        "severity": 5, "impact": 5,
        "floor": "4",
        "x": 175.0, "y": 405.0,
        "room_or_zone": "Lift",
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 2,
        "complaints": [
            ("Elevator trapped between 4th and 5th floor", "The main passenger elevator stopped abruptly between floors 4 and 5 with three students inside."),
            ("Lift alarm button sounding", "Alarm bell is ringing continuously from elevator shaft at the fourth floor landing."),
            ("Elevator doors jammed shut", "Door clutch mechanism on Lift 1 is stuck; cannot open from floor 4 landing."),
            ("Call button dead on floor 4", "The external lift call button on floor 4 shows no illumination and elevator is motionless in shaft."),
        ],
    },
    {
        "title": "Fume extractor exhaust failure in 3D Print Lab",
        "category": "FACILITIES",
        "severity": 4, "impact": 3,
        "floor": "8",
        "x": 120.0, "y": 45.0,
        "room_or_zone": "Additive Manufacturing Lab",
        "department": "Campus Estate Office",
        "hours_ago": 20,
        "complaints": [
            ("Plastic odor in 8th floor Additive Lab", "The ventilation fume hood in the 8th floor 3D printing lab is not pulling air; resin fumes accumulating."),
            ("Exhaust duct motor humming", "Exhaust fan on the roof above Additive Manufacturing Lab is stalled and buzzing."),
            ("Air quality alert in Additive Lab", "The VOC air sensor triggered amber light inside the printing room due to lack of extraction."),
        ],
    },
]


def sql_str(v: str | None) -> str:
    if v is None:
        return "NULL"
    return "'" + v.replace("'", "''") + "'"


def main() -> None:
    print(f"Generating indoor seed dataset ({len(INDOOR_CLUSTERS)} clusters across 10 floors)...")
    lines: list[str] = [
        "-- backend/db/seed.sql — Auto-generated indoor campus seed data (10-floor SVG architecture)",
        "-- Contains realistic complaints with real all-MiniLM-L6-v2 embeddings.",
        "",
        "TRUNCATE complaints, audit_logs, sla_escalations, issue_clusters, users CASCADE;",
        "",
        "-- ── USERS ───────────────────────────────────────────────────────────────────",
    ]

    user_ids: dict[str, str] = {}
    for i, (email, pw, name, role, dept) in enumerate(USERS, 1):
        uid = f"11111111-0000-0000-0000-{i:012d}"
        user_ids[email] = uid
        pwhash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
        lines.append(
            f"INSERT INTO users (id, email, password_hash, full_name, role, department, is_active) "
            f"VALUES ('{uid}', {sql_str(email)}, {sql_str(pwhash)}, {sql_str(name)}, '{role}', {sql_str(dept)}, TRUE);"
        )

    student_keys = [e for e, _, _, r, _ in USERS if r == "STUDENT"]
    complaint_counter = 0

    for c_idx, cluster_spec in enumerate(INDOOR_CLUSTERS, 1):
        cluster_id = f"22222222-0000-0000-0000-{c_idx:012d}"
        title = cluster_spec["title"]
        category = cluster_spec["category"]
        severity = cluster_spec["severity"]
        impact = cluster_spec["impact"]
        floor = cluster_spec["floor"]
        base_x = cluster_spec["x"]
        base_y = cluster_spec["y"]
        room = cluster_spec["room_or_zone"]
        dept = cluster_spec["department"]
        n_complaints = len(cluster_spec["complaints"])
        first_reported = NOW - timedelta(hours=cluster_spec["hours_ago"])
        last_reported = first_reported + timedelta(minutes=15 * (n_complaints - 1))

        score, tier, deadline = compute_priority(
            severity, n_complaints, impact, first_reported
        )

        # Compute combined representative embedding
        combined_text = f"{title}. " + " ".join(t for t, _ in cluster_spec["complaints"])
        cluster_emb = embed(combined_text)

        lines.append("")
        lines.append(f"-- ── Cluster {c_idx}: Floor {floor} · {room} — {title} (P={score}, {tier}) ──")
        summary_text = (
            f"{n_complaints} report(s) on Floor {floor} in {room} ({category}). "
            f"Peak severity {severity}/5 with impact {impact}/5 — currently OPEN."
        )
        lines.append(
            f"INSERT INTO issue_clusters (id, title, ai_summary, category, status, priority_score, "
            f"severity_score, impact_score, complaint_count, floor, x_coord, y_coord, room_or_zone, "
            f"representative_embedding, sla_deadline, first_reported_at, last_reported_at, assigned_department) "
            f"VALUES ('{cluster_id}', {sql_str(title)}, {sql_str(summary_text)}, '{category}', 'OPEN', "
            f"{score}, {severity}, {impact}, {n_complaints}, '{floor}', {base_x}, {base_y}, {sql_str(room)}, "
            f"'{json.dumps(cluster_emb)}', '{deadline.isoformat()}', '{first_reported.isoformat()}', "
            f"'{last_reported.isoformat()}', {sql_str(dept)});"
        )

        for offset, (c_title, c_desc) in enumerate(cluster_spec["complaints"]):
            complaint_counter += 1
            cid = f"33333333-0000-0000-0000-{complaint_counter:012d}"
            u_email = student_keys[(complaint_counter - 1) % len(student_keys)]
            uid = user_ids[u_email]
            c_time = first_reported + timedelta(minutes=offset * 12)

            # Small jitter within the room canvas area (±2 to 4 units)
            jitter_x = round(base_x + (offset * 1.5 - 2.0), 1)
            jitter_y = round(base_y + (offset * 1.0 - 1.5), 1)
            c_emb = embed(f"{c_title} {c_desc}")

            lines.append(
                f"INSERT INTO complaints (id, user_id, cluster_id, title, description, category, "
                f"severity, floor, x_coord, y_coord, room_or_zone, embedding, created_at) "
                f"VALUES ('{cid}', '{uid}', '{cluster_id}', {sql_str(c_title)}, {sql_str(c_desc)}, "
                f"'{category}', {severity}, '{floor}', {jitter_x}, {jitter_y}, {sql_str(room)}, "
                f"'{json.dumps(c_emb)}', '{c_time.isoformat()}');"
            )

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Generated {OUT_PATH} with {len(USERS)} users, {len(INDOOR_CLUSTERS)} clusters, and {complaint_counter} complaints!")


if __name__ == "__main__":
    main()
