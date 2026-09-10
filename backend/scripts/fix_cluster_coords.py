"""Fix cluster and complaint coordinates in the database to align with exact room zones."""
from app.db.session import get_session_factory
from app.db.models import IssueCluster, Complaint
from sqlalchemy import select

ROOM_MAPPINGS = [
    # Match keywords in title/summary -> (floor, room_or_zone, x, y)
    ("102", "1", "E. CR 102", 40.0, 196.0),
    ("hardware lab 1", "1", "Hardware Lab 1", 245.0, 492.0),
    ("hardware lab 2", "1", "Hardware Lab 2", 114.0, 492.0),
    ("hardware lab 3", "1", "Hardware Lab 3", 40.0, 492.0),
    ("faculty area 102", "1", "Faculty Area 102", 66.0, 41.0),
    ("faculty area 101", "1", "Faculty Area 101", 294.0, 41.0),
    ("104", "1", "E. CR 104", 320.0, 180.0),
    ("105", "1", "E. CR 105", 211.0, 350.0),
    ("106", "1", "E. CR 106", 148.0, 350.0),
    ("107", "1", "E. CR 107", 148.0, 180.0),
    ("108", "1", "E. CR 108", 211.0, 180.0),
    ("101", "1", "E. CR 101", 40.0, 250.0),
    ("103", "1", "E. CR 103", 40.0, 142.0),
    ("dean", "1", "Dean Office", 319.0, 492.0),
    ("panel room", "LG", "Electrical Panel Room", 162.0, 492.0),
    ("pantry", "LG", "Pantry", 100.0, 500.0),
    ("server room", "G", "Server Room", 180.0, 40.0),
    ("amu", "G", "AMU Room 1", 40.0, 41.0),
    ("301", "3", "Faculty Area 301", 294.0, 41.0),
    ("302", "3", "E. CR 302", 40.0, 492.0),
    ("lift", "4", "Lift", 175.0, 405.0),
    ("elevator", "4", "Lift", 175.0, 405.0),
]

def run():
    db = get_session_factory()()
    clusters = db.execute(select(IssueCluster)).scalars().all()
    print(f"Updating {len(clusters)} clusters...")
    
    # Pre-assign distinct default rooms for floor 1 so pins don't overlap on Floor 1 box
    floor_1_rooms = [
        ("E. CR 102", 40.0, 196.0),
        ("Hardware Lab 1", 245.0, 492.0),
        ("Faculty Area 102", 66.0, 41.0),
        ("E. CR 107", 148.0, 180.0),
        ("E. CR 101", 40.0, 250.0),
        ("E. CR 103", 40.0, 142.0),
        ("E. CR 105", 211.0, 350.0),
        ("E. CR 108", 211.0, 180.0),
        ("Hardware Lab 2", 114.0, 492.0),
        ("Dean Office", 319.0, 492.0),
    ]

    for idx, c in enumerate(clusters):
        matched = False
        text = f"{c.title or ''} {c.ai_summary or ''}".lower()
        for kw, floor, room, x, y in ROOM_MAPPINGS:
            if kw in text:
                c.floor = floor
                c.room_or_zone = room
                c.x_coord = x
                c.y_coord = y
                matched = True
                print(f"Matched cluster '{c.title[:30]}' -> Floor {floor}, {room} ({x}, {y})")
                break
        
        if not matched:
            # Assign from floor_1_rooms round-robin so it spreads across real classrooms
            room_name, rx, ry = floor_1_rooms[idx % len(floor_1_rooms)]
            c.floor = "1"
            c.room_or_zone = room_name
            c.x_coord = rx
            c.y_coord = ry
            print(f"Assigned cluster '{c.title[:30]}' -> Floor 1, {room_name} ({rx}, {ry})")

    # Also update complaints to match their parent cluster
    complaints = db.execute(select(Complaint)).scalars().all()
    for comp in complaints:
        if comp.cluster_id:
            parent = db.get(IssueCluster, comp.cluster_id)
            if parent:
                comp.floor = parent.floor
                comp.room_or_zone = parent.room_or_zone
                comp.x_coord = parent.x_coord
                comp.y_coord = parent.y_coord

    db.commit()
    print("All clusters and complaints successfully updated with exact classroom coordinates!")
    db.close()

if __name__ == "__main__":
    run()
