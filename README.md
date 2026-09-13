# Nivaran AI v2.0 — Campus Problem Intelligence Platform

> **Campusathon 2026 · PS5: Campus Problem Intelligence**
>
> Turning scattered campus complaints into actionable, prioritized, transparent resolution — across all 10 floors of the building.

---

## Overview

Nivaran AI is an intelligent campus grievance redressal platform that uses **indoor spatio-semantic clustering** and **multi-modal AI** to automatically merge duplicate reports, prioritize issues by urgency, and route them to the right departments — all in real time.

The entire campus is modelled as a **10-storey indoor facility (Floors LG, G, 1–8)** on a 360×534 interactive SVG blueprint canvas. When multiple students report the same problem (e.g., a leaking pipe outside Hardware Lab 1), Nivaran AI collapses them into a single **issue cluster on the same floor**, escalates its priority as more reports come in, and tracks it through SLA-bounded resolution with dual-proof photo verification — all visible on a public transparency wall.

---

## What's New in v2.0 (Indoor Pivot)

| Feature | Description |
|---------|-------------|
| 🏢 **Fully indoor spatial model** | GPS lat/long replaced by `floor / x_coord / y_coord / room_or_zone` on a 10-floor SVG canvas — clustering now uses **floor isolation + 2D Euclidean distance**, no Leaflet dependency |
| 🗺️ **Interactive SVG blueprints** | 20 hand-drawn floor plans (10 floors × dark/light themes) with click-to-pinpoint intake, heatmap overlays, and room-label toggles in Mission Control |
| 🤖 **CampBot AI assistant** | Floating conversational assistant on every page — Gemini-grounded on **live cluster data**, with a deterministic offline fallback and quick-action chips |
| 🎙️ **Voice intake** | Browser Web Speech API dictation (en-US English) with live transcript → auto-fills the complaint |
| 📷 **Door QR scan** | Simulated door-plaque QR lock-on: instantly sets floor + room + blueprint coordinates |
| 👍 **Me-Too Reinforce** | One-tap "+1 Reinforce" on nearby clusters boosts priority (+8.5) without a duplicate complaint |
| 🔧 **CMMS work-order checklists** | Every cluster ships with category-specific tools, spare parts, safety gear, estimated hours, and procedure |
| 🏛️ **Public Transparency Wall** | `/transparency` — public audit of dual-proof-verified repairs with draggable before/after sliders and a department SLA leaderboard |
| 🚨 **Facility Health Index** | Per-floor 0–100 gauge (100 − 5·open − 15·emergency) with elevator-floor navigator and emergency hotspot alerts |
| 📄 **Incident Memo generator** | Formal "Campus Operations Command" memorandum with reference codes, AI diagnostics, and print support |
| 🔊 **Cybernetic sound design** | Dependency-free Web Audio feedback — radar pings, urgency sirens, success chimes (global mute toggle) |
| 🎭 **Whistleblower mode** | Anonymous submissions that conceal reporter identity from technicians and public audit logs |
| ⚡ **Judge fast-track** | One-click role switching (Admin / Technician / Student / Faculty) from the Navbar and landing page |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Responsive SVG Floor Plans, Recharts, Web Speech API, Web Audio API |
| **Backend** | FastAPI 0.111+, Python 3.11+, SQLAlchemy 2.0, Pydantic v2 |
| **Database** | PostgreSQL with pgvector (vector similarity search) |
| **AI/ML** | Google Gemini 2.0 Flash (multi-modal intake + CampBot), sentence-transformers (MiniLM-L6-v2 embeddings) |
| **Real-time** | WebSockets with HTTP polling fallback |
| **Deployment** | Vercel (frontend), Render (API), Supabase (database) |

---

## Current Progress

### Backend — Feature Complete

| Module | Status | Description |
|--------|--------|-------------|
| `app/main.py` | ✅ | FastAPI app with lifespan, CORS, health endpoint |
| `app/core/config.py` | ✅ | Pydantic Settings with `.env` loading, indoor radius tuning |
| `app/core/security.py` | ✅ | JWT token creation and validation |
| `app/core/deps.py` | ✅ | Auth dependencies incl. `get_current_user_optional` for public endpoints |
| `app/core/campus_floors.json` | ✅ | Room registry — 209 rooms across 10 floors with canvas coordinates (extracted from SVG blueprints) |
| `app/db/models.py` | ✅ | SQLAlchemy ORM models with indoor `floor/x_coord/y_coord/room_or_zone` fields |
| `app/db/schema.sql` | ✅ | Full DDL with pgvector extension, indoor floor/coordinate schema, and HNSW indexes |
| `app/db/queries.py` | ✅ | Floor-aware spatio-semantic search with strict floor isolation & 2D Euclidean distance |
| `app/routers/auth_routes.py` | ✅ | Register, login, and `/me` endpoints |
| `app/routers/complaint_routes.py` | ✅ | Complaint submission with AI intake analysis (floor/room detection), `/mine` status tracking, `/analyze` vision pre-fill |
| `app/routers/cluster_routes.py` | ✅ | Active clusters (floor filter), nearby lookup, floor summary, detail, assign, resolve, **reinforce (Me-Too)**, status transitions, audit |
| `app/routers/admin_routes.py` | ✅ | Analytics KPI + trends endpoints and WebSocket room management |
| `app/routers/assistant_routes.py` | ✅ | **CampBot** — `/api/v1/assistant/chat` conversational Q&A grounded on the top-10 active clusters |
| `app/ai/gemini_intake.py` | ✅ | Multi-modal Gemini intake (room/door OCR + **floor detection**) + resolution proof verification + CMMS work-order checklist generator |
| `app/ai/summary.py` | ✅ | AI-generated cluster summaries with floor and room references |
| `app/vision/damage_grader.py` | ✅ | OpenCV damage grading (FixMyStreet port, optional dep) |
| `app/vision/litter_detector.py` | ✅ | YOLO waste-density hook for housekeeping (litter-detection port, optional dep) |
| `app/services/indoor_service.py` | ✅ | Indoor room/zone coordinate resolution and nearest room lookup (≤60 units) |
| `app/utils/geofencing.py` | ✅ | 2D Euclidean canvas distance & indoor radius filters |
| `app/utils/privacy_hash.py` | ✅ | Indoor canvas coordinate fuzzing + floor privacy hashing |
| `app/services/clustering_service.py` | ✅ | Floor-isolated spatio-semantic merge pipeline with department routing |
| `app/services/embedding_service.py` | ✅ | Sentence-transformer embeddings + vector blending |
| `app/services/priority_service.py` | ✅ | Explainable priority formula + SLA tier calculation |
| `app/services/sla_daemon.py` | ✅ | APScheduler-based SLA escalation daemon |
| `app/services/websocket_manager.py` | ✅ | Real-time broadcast to admin/technician rooms |
| `app/services/audit_service.py` | ✅ | Immutable audit trail logging |
| `db/seed.sql` | ✅ | 33 seeded complaints across 10 multi-floor indoor clusters with real embeddings |
| `Dockerfile` | ✅ | Backend image with pre-downloaded embedding model |

### Frontend — All Screens Built

| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Landing | `/` | ✅ | Hero with live telemetry KPIs, one-click judge role cards, interactive 10-floor blueprint showcase with incident dispatch telemetry |
| Login | `/login` | ✅ | Demo fast-track persona buttons + email/password auth with success chime |
| Register | `/register` | ✅ | Role picker with live role descriptions (Student, Faculty, Technician, Admin) |
| Radar Intake | `/report` | ✅ | Drag-and-drop photo/video AI pre-fill (auto floor/room/OCR), **voice dictation**, **door QR scan**, 10-floor selector, searchable room quick-picker, interactive blueprint pin-drop, **anonymous whistleblower mode**, nearby-cluster sidebar with **Me-Too reinforce** |
| My Tracker | `/tracker` | ✅ | Student status tracking: inline floor-plan blueprint view, resolution-stage timeline, live SLA countdown (flash-red under 30 min), before/proof photos, dual-proof verification status |
| Mission Control | `/admin` | ✅ | 3-column ops console: elevator floor navigator + tactical SVG blueprint (heatmap/labels/dark-light toggles, AI text filter) + cluster flyout; **Facility Health Gauge**, emergency hotspot banner, Recharts analytics drawer, **Incident Memo generator**, live WebSocket audio alerts |
| Task Force Terminal | `/technician` | ✅ | Mobile-first SLA queue with tabs; **swipe-right en-route / swipe-left defer** with reason picker; **CMMS tooling & parts block**; work-order modal with blueprint pin; dual-proof camera close-out with live **before/after slider** |
| **Transparency Wall** | `/transparency` | ✅ | **NEW — public (no auth)** audit wall: dual-proof-verified repair showcase with draggable before/after sliders, department SLA leaderboard, floor/category filters |

### Shared Infrastructure

| Component | Status |
|-----------|--------|
| Navbar (sticky, role-aware, judge fast-track switcher, global sound mute) | ✅ |
| CampBotChat (floating AI assistant, Gemini-grounded + offline fallback) | ✅ |
| FloorPlanViewer (interactive 360×534 SVG canvas, pin tooltips, dark/light themes, crosshair pin-drop mode) | ✅ |
| ElevatorFloorNavigator (10-floor vertical selector with room counts + live incident badges) | ✅ |
| FacilityHealthGauge (per-floor FHI circular gauge) | ✅ |
| BeforeAfterImageSlider (draggable dual-proof comparison) | ✅ |
| QrCodeScannerModal + VoiceIntakeButton (dependency-free Web APIs) | ✅ |
| IncidentMemoModal (formal university memorandum generator) | ✅ |
| Sound controller (Web Audio synth: radar ping, click, chime, urgency siren; persisted mute) | ✅ |
| WebSocket hook with polling fallback | ✅ |
| API client with JWT auth | ✅ |
| Auth helpers (login, register, role routing, quickLoginAs demo personas) | ✅ |
| Dark cyber-intelligence theme (Tailwind + CSS animations) | ✅ |
| TypeScript types for all indoor API contracts (incl. WorkOrderChecklist, FloorSummary) | ✅ |

---

## Key Features

### Indoor Spatio-Semantic Clustering
New complaints are matched against existing clusters using a three-stage indoor filter:
1. **Floor Isolation Filter**: Only clusters on the exact same floor (`floor = :new_floor`) are candidates.
2. **Canvas 2D Euclidean Distance**: Candidate must be within 35 canvas units ($\sqrt{\Delta x^2 + \Delta y^2} \le 35$) on the 360×534 SVG blueprint.
3. **Cosine Similarity Threshold** (≥0.52) on 384-dimensional MiniLM embeddings.

Matched complaints merge into existing clusters, incrementing recurrence and escalating priority. Students can also **Me-Too reinforce** an existing cluster (+1 count, +8.5 priority) straight from the nearby-clusters sidebar.

### CampBot AI Assistant
`POST /api/v1/assistant/chat` grounds every answer in the **top-10 live active clusters** (floor, room, status, priority, department) and answers conversationally via Gemini. Works with or without login (`get_current_user_optional`). When Gemini is unreachable, a deterministic fallback answers about QR usage, per-floor status, leaks, and emergency protocol — hackathon-safe.

### CMMS Work-Order Checklists
Every cluster response includes a `work_order_checklist` keyed by category (IT_SUPPORT, MAINTENANCE, HOUSEKEEPING, FACILITIES, ADMINISTRATION) with estimated hours, mandatory safety gear, required tools, recommended spare parts, and step-by-step procedure — rendered in the Task Force Terminal before dispatch.

### Explainable Priority Scoring

$$P = (S \times 7) + (\min(10, R) \times 3.5) + (I \times 4) + (\min(48, D) \times 0.25)$$

| Variable | Source | Range |
|----------|--------|-------|
| S (Severity) | Gemini Vision | 1–5 |
| R (Recurrence) | Cluster complaint count | 1–10 (capped) |
| I (Impact) | Gemini Vision | 1–5 |
| D (Duration) | Hours since first report | 0–48 (capped) |

### SLA Tiers

| Score | Tier | Deadline |
|-------|------|----------|
| ≥75 | Emergency | 2 hours |
| 50–74 | High | 12 hours |
| 25–49 | Medium | 24 hours |
| <25 | Low | 72 hours |

### Demo Failsafe
Set `MOCK_AI=true` to activate the indoor keyword-regex fallback (including floor and room detection) when venue Wi-Fi blocks the Gemini API — no 500 errors during live demos.

### Demo Accounts (seed data)
Loaded by `backend/db/seed.sql`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nivaran.edu` | `Admin@123` |
| Faculty | `faculty@nivaran.edu` | `Faculty@123` |
| Technician (Civil/Electrical) | `tech.maintenance@nivaran.edu` | `Tech@123` |
| Technician (IT Services) | `tech.it@nivaran.edu` | `Tech@123` |
| Technician (Housekeeping) | `tech.housekeeping@nivaran.edu` | `Tech@123` |
| Students ×6 | `student1..6@nivaran.edu` | `Student@123` |

The login page and Navbar expose one-click **Demo Fast-Track** buttons for all four personas.

### Live-Verified Integration
The complete judge-demo narrative passes against a running stack
(`backend/app/tests/test_full_flow.py`):
`✅ Student intake → ✅ Cluster merge (same-floor, ±5 units) → ✅ Priority escalation → ✅ Technician resolve (dual-proof)` 
with the full audit trail (`COMPLAINT_SUBMITTED → EN_ROUTE → CLUSTER_RESOLVED`).

### Calibration Notes
* **Merge threshold 0.52** (not BUILD.md's 0.78): with all-MiniLM-L6-v2, paraphrased duplicates score 0.55–0.92 while different issues in the same room score 0.37–0.46. BUILD.md's 0.78 would reject its own demo merge pair (0.547); 0.52 keeps every true duplicate and cleanly separates incidents.
* **Cluster radius 35 canvas units** (`AUTO_CLUSTER_RADIUS_UNITS`): standardized on the 360×534 SVG blueprint — proximity within the same room or corridor area. Floor isolation replaces the old Haversine bounding box entirely.
* **psycopg3 driver**: `app/db/session.py` normalises any `postgresql://` URL to SQLAlchemy's `+psycopg` dialect (requirements ship psycopg[binary], not psycopg2).
* **Supabase session pooler (port 5432)** is required for SQLAlchemy; the transaction pooler (6543) breaks prepared statements.

---

## Project Structure

```
main_project/
├── docker-compose.yml       # Full local stack (pgvector + API + UI)
├── .env.example             # Compose environment template
├── backend/
│   ├── Dockerfile           # Backend image (model pre-downloaded)
│   ├── app/
│   │   ├── ai/              # Gemini intake (floor/room OCR) + summaries + CMMS checklists
│   │   ├── core/            # Config, security, deps, campus_floors.json (room registry)
│   │   ├── db/              # Models (indoor coords), schema, queries, session
│   │   ├── routers/         # auth, complaints, clusters, admin, assistant (CampBot)
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Clustering, embeddings, priority, SLA, WebSocket, audit, indoor
│   │   ├── tests/           # pytest unit tests + full-flow smoke test
│   │   ├── utils/           # Indoor geofencing + coordinate privacy
│   │   ├── vision/          # Damage grading + waste density (tier2 ports)
│   │   └── main.py          # FastAPI app entry point
│   ├── db/
│   │   ├── schema.sql       # PostgreSQL DDL with pgvector + indoor coordinate columns
│   │   └── seed.sql         # 33 complaints / 10 clusters demo data
│   ├── scripts/
│   │   ├── generate_seed.py # Regenerates seed.sql with real embeddings
│   │   └── extract_rooms.py # One-time room-label extraction from SVG floor plans
│   ├── uploads/             # Runtime image storage
│   ├── .env.example         # Environment template
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── Dockerfile           # Multi-stage Next.js image
    ├── public/
    │   └── floor_plans/     # 20 SVG blueprints (10 floors × dark/light)
    ├── src/
    │   ├── app/             # Pages (landing, login, register, report, tracker,
    │   │                    #   admin, technician, transparency)
    │   ├── components/
    │   │   ├── admin/       # IncidentMemoModal
    │   │   ├── chat/        # CampBotChat
    │   │   ├── floorplan/   # FloorPlanViewer, ElevatorFloorNavigator, FacilityHealthGauge
    │   │   ├── layout/      # Navbar (role switcher, sound toggle)
    │   │   ├── report/      # QrCodeScannerModal, VoiceIntakeButton
    │   │   ├── technician/  # BeforeAfterImageSlider
    │   │   └── ui/          # Primitives (Badge, Button, Card, Dialog, Progress)
    │   ├── hooks/           # useWebSocket with polling fallback
    │   └── lib/             # API client, auth, types, campus_floors, sound, utils
    ├── package.json         # Node dependencies (Leaflet removed in v2.0)
    └── tsconfig.json        # TypeScript config
```

---

## Getting Started

### One-Command Local Stack (Docker)

```bash
cp .env.example .env          # fill GEMINI_API_KEY, JWT_SECRET
docker compose up --build -d  # pgvector + API on :8000 + UI on :3000
```

Schema and seed data (33 complaints / 10 clusters) load automatically on first boot via the `docker-entrypoint-initdb.d` mounts.

### Database Setup (Docker, no compose)

```bash
docker run -d --name nivaran_db \
  -e POSTGRES_DB=nivaran_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -v ./backend/db/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql \
  -v ./backend/db/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql \
  ankane/pgvector:latest
```

Then update `backend/.env`:
```
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/nivaran_db
```

To regenerate demo data after editing the seed narrative:
```bash
cd backend && .venv/Scripts/python scripts/generate_seed.py
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `GEMINI_API_KEY` | Google AI Studio API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `EMBEDDING_MODEL_NAME` | sentence-transformers model | `all-MiniLM-L6-v2` |
| `MOCK_AI` | Enable indoor keyword fallback (no Gemini) | `false` |
| `JWT_SECRET` | Secret key for JWT signing | — |
| `ALLOWED_CORS_ORIGINS` | JSON array of allowed origins | `["http://localhost:3000"]` |
| `AUTO_CLUSTER_RADIUS_UNITS` | Cluster merge radius in SVG canvas units | `35.0` |
| `MIN_SEMANTIC_SIMILARITY_THRESHOLD` | Cosine merge threshold | `0.52` |
| `NEXT_PUBLIC_API_URL` | Backend API URL (frontend) | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL (frontend) | Derived from API URL |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Authenticate and get JWT |
| GET | `/api/v1/auth/me` | Get current user profile |

### Complaints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/complaints` | Submit complaint (floor, x_coord, y_coord, room_or_zone) — triggers AI intake + clustering |
| POST | `/api/v1/complaints/analyze` | Analyze image without submission (category, severity, **floor, room**, OCR, damage grade) |
| GET | `/api/v1/complaints/mine` | Reporter's own submissions with live cluster status |

### Clusters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/clusters/active` | List clusters (priority-sorted, status & **floor** filterable) |
| GET | `/api/v1/clusters/nearby` | Find clusters near a floor + canvas point (`floor`, `x`, `y`) |
| GET | `/api/v1/clusters/floors/summary` | Per-floor incident density (open/emergency counts, max priority) for the building navigator |
| GET | `/api/v1/clusters/technicians` | List available technicians |
| GET | `/api/v1/clusters/{id}` | Cluster detail with child complaints + work-order checklist |
| PATCH | `/api/v1/clusters/{id}/assign` | Assign technician to cluster |
| POST | `/api/v1/clusters/{id}/status` | En-Route (IN_PROGRESS) or defer with reason (OPEN) |
| POST | `/api/v1/clusters/{id}/resolve` | Resolve with dual-proof verification |
| POST | `/api/v1/clusters/{id}/reinforce` | **Me-Too upvote** — +1 count, +8.5 priority, WS broadcast |
| GET | `/api/v1/clusters/{id}/audit` | Immutable audit trail |

### Assistant (CampBot)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/assistant/chat` | Conversational Q&A grounded on live active clusters (auth optional) |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/analytics` | KPI metrics (open clusters, avg resolution, SLA breach rate) |
| GET | `/api/v1/admin/trends` | 14-day volume series + category breakdown (Recharts feed) |
| WS | `/api/v1/admin/ws/{room}` | WebSocket for real-time updates (admin/technician) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health (DB, embedding service, Gemini API) |

---

## Testing

```bash
cd backend

# Unit tests (clustering, priority formula, indoor geofencing, privacy hash)
.venv/Scripts/python -m pytest app/tests/ -v

# Full-stack smoke test — the complete judge-demo narrative
# (requires the backend running on localhost:8000 with any DB state)
.venv/Scripts/python app/tests/test_full_flow.py
# Expected: ✅ Student intake → ✅ Cluster merge → ✅ Priority escalation → ✅ Technician resolve
```

---

## Deployment

| Layer | Platform |
|-------|----------|
| Database | [Supabase](https://supabase.com) (pgvector support) |
| Backend API | [Render](https://render.com) (Docker-native) |
| Frontend | [Vercel](https://vercel.com) (Next.js optimized) |

---

## License

This project was built for **Campusathon 2026** — PS5: Campus Problem Intelligence.
