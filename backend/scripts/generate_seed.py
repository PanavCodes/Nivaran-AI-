"""Generate backend/db/seed.sql — BUILD.md Day 4 Step 1.

Produces 30+ geographically-clustered demo complaints across the six coordinate
groups specified in BUILD.md §4 (library ×3, cafeteria ×4, IT lab ×2, sports
field ×2, hostel ×3, main gate ×2 — plus additional groups to exceed 30), each
with a real all-MiniLM-L6-v2 embedding so the HNSW index and demo clustering
behave exactly like production traffic.

Usage:
    cd backend
    ./.venv/Scripts/python scripts/generate_seed.py

Then apply (fresh DB only):
    psql $DATABASE_URL -f db/seed.sql
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

# BUILD.md §4 coordinate groups (50 m clustering radius → intra-group merge)
CLUSTERS = [
    {
        "title": "Leaking pipe flooding library corridor",
        "category": "MAINTENANCE",
        "severity": 4, "impact": 4,
        "lat": 18.9220, "lon": 72.8347,
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 2,
        "complaints": [
            ("Water everywhere in library", "Main corridor near Room 102 in the library has a leaking pipe causing severe flooding. Water is spreading towards the reading hall."),
            ("Slippery library hallway", "The hallway floor in the library is completely wet due to water dripping from the ceiling. People are slipping near the stairs."),
            ("Ceiling drip near Room 102", "There is a constant drip from the ceiling in the library corridor close to Room 102. A bucket has been placed but it overflows."),
            ("Books getting wet in library", "The leak near the periodicals section is dripping onto the shelves. Books on the bottom rack are soaked."),
        ],
    },
    {
        "title": "Cafeteria garbage not collected",
        "category": "HOUSEKEEPING",
        "severity": 3, "impact": 4,
        "lat": 18.9228, "lon": 72.8351,
        "department": "Sanitation & Housekeeping",
        "hours_ago": 9,
        "complaints": [
            ("Overflowing bins at cafeteria", "Garbage bins outside the main cafeteria have not been collected for two days. Waste is overflowing onto the walkway and it smells."),
            ("Foul smell near canteen", "The area behind the canteen stinks because of uncleared food waste. Flies everywhere near the seating."),
            ("Litter around cafeteria entrance", "Food wrappers and bottles are piling up at the cafeteria entrance. Dustbins are full to the brim."),
            ("Waste truck has not come", "The cleaning staff says the waste collection truck has not come since Friday. Cafeteria trash is now spilling into the parking area."),
            ("Trash attracting stray dogs", "Stray dogs are rummaging through the overflowing garbage bags near the canteen back gate. Students feel unsafe walking past at night."),
        ],
    },
    {
        "title": "IT lab computers will not start",
        "category": "IT_SUPPORT",
        "severity": 3, "impact": 3,
        "lat": 18.9215, "lon": 72.8340,
        "department": "IT Services",
        "hours_ago": 26,
        "complaints": [
            ("Lab PCs dead in morning", "Around six computers in Lab 3 do not power on. The monitor stays black when the button is pressed."),
            ("Computers not booting", "Systems 12 to 18 in the computer lab fail at boot with an error screen. Practical session is stuck."),
            ("Lab network keeps dropping", "The wired internet in the computer lab disconnects every few minutes. Cannot submit the online assignment from there."),
        ],
    },
    {
        "title": "Floodlights out at sports field",
        "category": "FACILITIES",
        "severity": 2, "impact": 3,
        "lat": 18.9240, "lon": 72.8360,
        "department": "Campus Estate Office",
        "hours_ago": 33,
        "complaints": [
            ("Sports field lights off", "The floodlights at the main sports field have been out for three evenings. Evening practice is impossible in the dark."),
            ("Dark jogging track", "Half the lights along the jogging track around the field are not working. It is unsafe after 7 pm."),
            ("Broken lamp posts near field", "Two lamp posts on the path to the sports field are leaning and dead. The whole stretch is pitch black."),
        ],
    },
    {
        "title": "Hostel elevator stuck between floors",
        "category": "MAINTENANCE",
        "severity": 5, "impact": 5,
        "lat": 18.9210, "lon": 72.8335,
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 5,
        "complaints": [
            ("Elevator stalled again", "The lift in Hostel B got stuck between the 3rd and 4th floor this morning with two students inside. It is happening repeatedly this week."),
            ("Lift makes grinding noise", "The hostel elevator grinds loudly and jerks when moving. Someone was trapped for ten minutes yesterday night."),
            ("Elevator door jams", "The B hostel lift door jams every time it reaches the ground floor. My grandmother-visiting parents could not use it."),
            ("Fourth floor lift button dead", "The button for the fourth floor inside the hostel lift does not light up at all. Residents climb four flights daily."),
        ],
    },
    {
        "title": "Broken main gate turnstile",
        "category": "FACILITIES",
        "severity": 2, "impact": 4,
        "lat": 18.9200, "lon": 72.8330,
        "department": "Campus Estate Office",
        "hours_ago": 47,
        "complaints": [
            ("Turnstile stuck at gate", "The second turnstile at the main gate is jammed and everyone has to squeeze through one lane during morning rush."),
            ("Entry gate scanner broken", "The ID card scanner at gate 2 shows an error for every card. Security is letting people in manually."),
            ("Gate barrier stuck open", "The vehicle barrier at the main gate is stuck half-open and scrapes every car. Traffic backs up till the road."),
        ],
    },
    # ── Extra groups to push the total past 30 (BUILD.md: "30+ issues") ──
    {
        "title": "Projector flickering in seminar hall",
        "category": "IT_SUPPORT",
        "severity": 2, "impact": 3,
        "lat": 18.9225, "lon": 72.8344,
        "department": "IT Services",
        "hours_ago": 20,
        "complaints": [
            ("Projector flickers in hall A", "The projector in Seminar Hall A flickers every few minutes and the colour washes out. Lectures are hard to follow."),
            ("No display from ceiling projector", "The ceiling projector in the seminar hall shows nothing until it warms up for twenty minutes."),
            ("HDMI port dead at podium", "The HDMI input at the seminar hall podium does not detect any laptop. Presentations fall back to the small classroom."),
        ],
    },
    {
        "title": "Blocked washroom drains in academic block",
        "category": "HOUSEKEEPING",
        "severity": 4, "impact": 4,
        "lat": 18.9218, "lon": 72.8352,
        "department": "Sanitation & Housekeeping",
        "hours_ago": 14,
        "complaints": [
            ("Washroom drain clogged", "The ground floor washroom drains in the academic block are completely clogged and water is stagnating. Unhygienic smell all over."),
            ("Water logging in washroom", "First floor ladies washroom has water all over the floor because the drain is blocked since yesterday."),
            ("Bad smell from toilets", "The toilets near Room 210 stink because of choked drains. Several students have complained to the class rep."),
            ("Overflowing washroom dustbin", "The sanitary bin in the academic block washroom overflows by midday every day. Cleaning happens only once a day."),
        ],
    },
    {
        "title": "Cracked wall plaster in classroom 114",
        "category": "MAINTENANCE",
        "severity": 3, "impact": 3,
        "lat": 18.9222, "lon": 72.8339,
        "department": "Civil & Electrical Maintenance",
        "hours_ago": 55,
        "complaints": [
            ("Plaster falling in class 114", "Chunks of plaster keep falling from the wall in classroom 114 near the blackboard. One piece almost hit a student."),
            ("Big crack in classroom wall", "There is a widening diagonal crack on the wall of Room 114. Dust keeps settling on the front benches."),
            ("Ceiling stain spreading in 114", "A brown water stain on the ceiling of classroom 114 keeps growing after every rain. Feels unsafe during lectures."),
        ],
    },
]


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def vec(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.7f}" for x in v) + "]"


def main() -> None:
    lines: list[str] = [
        "-- backend/db/seed.sql — Nivaran AI demo data (BUILD.md Day 4 Step 1).",
        "-- 34 complaints across 9 coordinate groups; groups are within 50 m of",
        "-- themselves so the spatio-semantic engine treats them as clusters.",
        "-- FRESH DATABASE ONLY (truncate option below).",
        "",
        "-- TRUNCATE audit_logs, sla_escalations, complaints, issue_clusters, users CASCADE;",
        "",
        "BEGIN;",
    ]

    user_ids: dict[str, str] = {}
    for i, (email, password, full_name, role, dept) in enumerate(USERS):
        uid = f"11111111-0000-0000-0000-{i:012d}"
        user_ids[email] = uid
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        lines.append(
            "INSERT INTO users (id, email, password_hash, full_name, role, department) VALUES ("
            f"'{uid}', {q(email)}, {q(pw_hash)}, {q(full_name)}, {q(role)}, {q(dept)});"
        )

    students = [e for e, *_ in USERS if e.startswith("student")]
    complaint_no = 0
    cluster_no = 0
    for spec in CLUSTERS:
        cluster_no += 1
        cid = f"22222222-0000-0000-0000-{cluster_no:012d}"
        first_at = NOW - timedelta(hours=spec["hours_ago"])
        complaints = spec["complaints"]
        reps = [embed(f"{t}. {d}") for t, d in complaints]

        # Blended representative embedding (0.7 existing + 0.3 new per merge)
        rep = reps[0]
        for nxt in reps[1:]:
            blended = [0.7 * a + 0.3 * b for a, b in zip(rep, nxt)]
            norm = sum(x * x for x in blended) ** 0.5
            rep = [x / norm for x in blended]

        score, tier, deadline = compute_priority(
            spec["severity"], len(complaints), spec["impact"], first_at
        )
        deadline = first_at + timedelta(
            hours={"EMERGENCY": 2, "HIGH": 12, "MEDIUM": 24, "LOW": 72}[tier]
        )
        summary = (
            f"{len(complaints)} report(s) of \"{spec['title']}\" ({spec['category']}). "
            f"Peak severity {spec['severity']}/5 with impact {spec['impact']}/5 — currently OPEN."
        )
        lines.append("")
        lines.append(f"-- ── Cluster {cluster_no}: {spec['title']} (P={score}, {tier}) ──")
        lines.append(
            "INSERT INTO issue_clusters (id, title, ai_summary, category, status, "
            "priority_score, severity_score, impact_score, complaint_count, latitude, "
            "longitude, representative_embedding, sla_deadline, first_reported_at, "
            "last_reported_at, assigned_department) VALUES ("
            f"'{cid}', {q(spec['title'])}, {q(summary)}, {q(spec['category'])}, 'OPEN', "
            f"{score}, {spec['severity']}, {spec['impact']}, {len(complaints)}, "
            f"{spec['lat']}, {spec['lon']}, '{vec(rep)}', "
            f"'{deadline.isoformat()}', '{first_at.isoformat()}', "
            f"'{(first_at + timedelta(minutes=17 * len(complaints))).isoformat()}', "
            f"{q(spec['department'])});"
        )

        for j, (title, desc) in enumerate(complaints):
            complaint_no += 1
            uid = user_ids[students[complaint_no % len(students)]]
            created = first_at + timedelta(minutes=17 * j + 3)
            lines.append(
                "INSERT INTO complaints (id, user_id, cluster_id, title, description, "
                "category, severity, latitude, longitude, embedding, created_at) VALUES ("
                f"'33333333-0000-0000-0000-{complaint_no:012d}', '{uid}', '{cid}', "
                f"{q(title)}, {q(desc)}, {q(spec['category'])}, {spec['severity']}, "
                f"{spec['lat'] + 0.000004 * j}, {spec['lon'] + 0.000004 * j}, "
                f"'{vec(reps[j])}', '{created.isoformat()}');"
            )
        lines.append(
            "INSERT INTO audit_logs (cluster_id, action_taken, details) VALUES ("
            f"'{cid}', 'CLUSTER_SEEDED', '{json.dumps({'source': 'seed.sql', 'complaints': len(complaints)})}');"
        )
        if tier in ("EMERGENCY", "HIGH") and spec["hours_ago"] >= 5:
            lines.append(
                "INSERT INTO sla_escalations (cluster_id, escalation_level, "
                "notified_emails, next_check_at) VALUES ("
                f"'{cid}', 1, ARRAY['admin@nivaran.edu'::text, 'warden@nivaran.edu'::text], "
                f"'{(NOW + timedelta(minutes=60)).isoformat()}');"
            )

    lines.append("")
    lines.append("COMMIT;")
    lines.append("")
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_PATH} — {complaint_no} complaints across {cluster_no} clusters.")


if __name__ == "__main__":
    main()
