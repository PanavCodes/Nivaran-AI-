# Nivaran AI — Campus Problem Intelligence Platform

> **Campusathon 2026 · PS5: Campus Problem Intelligence**
>
> Turning scattered campus complaints into actionable, prioritized, transparent resolution.

---

## Overview

Nivaran AI is an intelligent campus grievance redressal platform that uses **spatio-semantic clustering** and **multi-modal AI** to automatically merge duplicate reports, prioritize issues by urgency, and route them to the right departments — all in real time.

When multiple students report the same problem (e.g., a leaking pipe near the library), Nivaran AI collapses them into a single **issue cluster**, escalates its priority as more reports come in, and tracks it through SLA-bounded resolution with dual-proof photo verification.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Leaflet.js, Recharts |
| **Backend** | FastAPI 0.111+, Python 3.11+, SQLAlchemy 2.0, Pydantic v2 |
| **Database** | PostgreSQL with pgvector (vector similarity search) |
| **AI/ML** | Google Gemini 2.0 Flash (multi-modal intake), sentence-transformers (MiniLM-L6-v2 embeddings) |
| **Real-time** | WebSockets with HTTP polling fallback |
| **Deployment** | Vercel (frontend), Render (API), Supabase (database) |

---

## Current Progress

### Backend — Feature Complete

| Module | Status | Description |
|--------|--------|-------------|
| `app/main.py` | ✅ | FastAPI app with lifespan, CORS, health endpoint |
| `app/core/config.py` | ✅ | Pydantic Settings with `.env` loading |
| `app/core/security.py` | ✅ | JWT token creation and validation |
| `app/db/models.py` | ✅ | SQLAlchemy ORM models (User, Complaint, IssueCluster, SlaEscalation, AuditLog) |
| `app/db/schema.sql` | ✅ | Full DDL with pgvector extension and HNSW indexes |
| `app/db/queries.py` | ✅ | Spatio-semantic search SQL with Haversine distance |
| `app/routers/auth_routes.py` | ✅ | Register, login, and `/me` endpoints |
| `app/routers/complaint_routes.py` | ✅ | Complaint submission with AI intake analysis, `/mine` status tracking, `/analyze` vision pre-fill |
| `app/routers/cluster_routes.py` | ✅ | Active clusters, nearby lookup, detail, assign, resolve, status transitions (En-Route/defer), audit |
| `app/routers/admin_routes.py` | ✅ | Analytics KPI + trends endpoints and WebSocket room management |
| `app/ai/gemini_intake.py` | ✅ | Multi-modal Gemini intake + resolution proof verification |
| `app/ai/summary.py` | ✅ | AI-generated cluster summaries |
| `app/vision/damage_grader.py` | ✅ | OpenCV damage grading (FixMyStreet port, optional dep) |
| `app/vision/litter_detector.py` | ✅ | YOLO waste-density hook for housekeeping (litter-detection port, optional dep) |
| `app/utils/geofencing.py` | ✅ | Haversine distance / radius gates (Community_Compliance port) |
| `app/utils/privacy_hash.py` | ✅ | GPS fuzzing + grid hashing (City-Sync port) |
| `app/services/clustering_service.py` | ✅ | Spatio-semantic merge pipeline with department routing |
| `app/services/embedding_service.py` | ✅ | Sentence-transformer embeddings + vector blending |
| `app/services/priority_service.py` | ✅ | Explainable priority formula + SLA tier calculation |
| `app/services/sla_daemon.py` | ✅ | APScheduler-based SLA escalation daemon |
| `app/services/websocket_manager.py` | ✅ | Real-time broadcast to admin/technician rooms |
| `app/services/audit_service.py` | ✅ | Immutable audit trail logging |
| `db/seed.sql` | ✅ | 32 seeded complaints across 9 clusters with real embeddings (Day 4) |
| `Dockerfile` | ✅ | Backend image with pre-downloaded embedding model |

### Frontend — All Screens Built

| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Landing | `/` | ✅ | Hero section with feature cards, role-aware CTA |
| Login | `/login` | ✅ | Email/password authentication |
| Register | `/register` | ✅ | Multi-role registration (Student, Faculty, Technician, Admin) |
| Radar Intake | `/report` | ✅ | Drag-and-drop photo/video upload with AI pre-fill, radar sweep canvas, nearby cluster sidebar, submission feedback modal with tracker link |
| My Reports | `/tracker` | ✅ | Student status tracking: resolution-stage timeline, SLA countdown, before/proof photos |
| Mission Control | `/admin` | ✅ | Full-screen split view: Leaflet map with pulsing pins + cluster detail flyout + radial priority gauge + KPI row + Recharts analytics (AreaChart/RadarChart) |
| Task Force Terminal | `/technician` | ✅ | Mobile-first SLA queue with live countdown timers, swipe-right En-Route / swipe-left defer with reason picker, dual-proof photo verification |

### Shared Infrastructure

| Component | Status |
|-----------|--------|
| UI primitives (Badge, Button, Card, Dialog, Progress) | ✅ |
| WebSocket hook with polling fallback | ✅ |
| API client with JWT auth | ✅ |
| Auth helpers (login, register, role routing) | ✅ |
| Dark cyber-intelligence theme (Tailwind + CSS animations) | ✅ |
| TypeScript types for all API contracts | ✅ |

---

## Key Features

### Spatio-Semantic Clustering
New complaints are matched against existing clusters using a three-stage filter:
1. **Bounding-box pre-filter** (~50m radius)
2. **Haversine distance** verification
3. **Cosine similarity** threshold (≥0.78) on 384-dim embeddings

Matched complaints merge into existing clusters, incrementing recurrence and escalating priority.

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
Set `MOCK_AI=true` to activate keyword-regex fallback when venue Wi-Fi blocks Gemini API — no 500 errors during live demos.

### Demo Accounts (seed data)
Loaded by `backend/db/seed.sql`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nivaran.edu` | `Admin@123` |
| Faculty | `faculty@nivaran.edu` | `Faculty@123` |
| Technician | `tech.maintenance@nivaran.edu` | `Tech@123` |
| Students ×6 | `student1..6@nivaran.edu` | `Student@123` |

### Live-Verified Integration
The complete judge-demo narrative passes against a running stack
(`backend/app/tests/test_full_flow.py`):
`✅ Student intake → ✅ Cluster merge (P 36.5→40) → ✅ Priority escalation → ✅ Technician resolve (dual-proof 0.92)`
with the full audit trail (`COMPLAINT_SUBMITTED → EN_ROUTE → CLUSTER_RESOLVED`).

### Calibration Notes
* **Merge threshold 0.52** (not BUILD.md's 0.78): with all-MiniLM-L6-v2, paraphrased duplicates score 0.55–0.92 while different issues in the same room score 0.37–0.46. BUILD.md's 0.78 would reject its own demo merge pair (0.547); 0.52 keeps every true duplicate and cleanly separates incidents.
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
│   │   ├── ai/              # Gemini intake + cluster summaries
│   │   ├── core/            # Config, security, dependencies
│   │   ├── db/              # Models, schema, queries, session
│   │   ├── routers/         # auth, complaints, clusters, admin
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # Clustering, embeddings, priority, SLA, WebSocket, audit
│   │   ├── tests/           # pytest unit tests + full-flow smoke test
│   │   ├── utils/           # Geofencing + GPS privacy (tier2 ports)
│   │   ├── vision/          # Damage grading + waste density (tier2 ports)
│   │   └── main.py          # FastAPI app entry point
│   ├── db/
│   │   ├── schema.sql       # PostgreSQL DDL with pgvector (verbatim BUILD.md §3.1)
│   │   └── seed.sql         # 32 complaints / 9 clusters demo data
│   ├── scripts/
│   │   └── generate_seed.py # Regenerates seed.sql with real embeddings
│   ├── uploads/             # Runtime image storage
│   ├── .env.example         # Environment template
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── Dockerfile           # Multi-stage Next.js image
    ├── src/
    │   ├── app/             # Pages (landing, login, register, report, tracker, admin, technician)
    │   ├── components/      # UI primitives + NivaranMap + AnalyticsCharts
    │   ├── hooks/           # useWebSocket with polling fallback
    │   └── lib/             # API client, auth, types, utils
    ├── package.json         # Node dependencies
    └── tsconfig.json        # TypeScript config
```

---

## Getting Started

### One-Command Local Stack (Docker)

```bash
cp .env.example .env          # fill GEMINI_API_KEY, JWT_SECRET
docker compose up --build -d  # pgvector + API on :8000 + UI on :3000
```

Schema and seed data (32 complaints / 9 clusters) load automatically on first boot via the `docker-entrypoint-initdb.d` mounts.

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
| `MOCK_AI` | Enable keyword fallback (no Gemini) | `false` |
| `JWT_SECRET` | Secret key for JWT signing | — |
| `ALLOWED_CORS_ORIGINS` | JSON array of allowed origins | `["http://localhost:3000"]` |
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
| POST | `/api/v1/complaints` | Submit complaint (triggers AI intake + clustering) |
| POST | `/api/v1/complaints/analyze` | Analyze image without submission (category, severity, OCR, damage grade) |
| GET | `/api/v1/complaints/mine` | Reporter's own submissions with live cluster status |

### Clusters
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/clusters/active` | List all clusters (priority-sorted, status-filterable) |
| GET | `/api/v1/clusters/nearby` | Find clusters near coordinates |
| GET | `/api/v1/clusters/technicians` | List available technicians |
| GET | `/api/v1/clusters/{id}` | Cluster detail with child complaints |
| PATCH | `/api/v1/clusters/{id}/assign` | Assign technician to cluster |
| POST | `/api/v1/clusters/{id}/status` | En-Route (IN_PROGRESS) or defer with reason (OPEN) |
| POST | `/api/v1/clusters/{id}/resolve` | Resolve with dual-proof verification |
| GET | `/api/v1/clusters/{id}/audit` | Immutable audit trail |

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

# Unit tests (clustering, priority formula, geofencing, privacy hash)
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
