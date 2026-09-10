-- backend/db/schema.sql
-- Nivaran AI — verbatim DDL from BUILD.md §3.1. Do not paraphrase.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE user_role AS ENUM ('STUDENT', 'FACULTY', 'TECHNICIAN', 'ADMIN');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE issue_category AS ENUM (
    'IT_SUPPORT', 'MAINTENANCE', 'HOUSEKEEPING', 'FACILITIES', 'ADMINISTRATION'
);

-- ─────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    role             user_role NOT NULL DEFAULT 'STUDENT',
    department       VARCHAR(100),
    avatar_url       VARCHAR(512),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  ISSUE CLUSTERS  (the AI-merged parent records)
-- ─────────────────────────────────────────────
CREATE TABLE issue_clusters (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                    VARCHAR(255) NOT NULL,
    ai_summary               TEXT,
    category                 issue_category NOT NULL,
    status                   ticket_status NOT NULL DEFAULT 'OPEN',
    priority_score           FLOAT NOT NULL DEFAULT 0.0,
    severity_score           INT NOT NULL CHECK (severity_score BETWEEN 1 AND 5),
    impact_score             INT NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
    complaint_count          INT NOT NULL DEFAULT 1,
    floor                    VARCHAR(10) NOT NULL,
    x_coord                  FLOAT NOT NULL,
    y_coord                  FLOAT NOT NULL,
    room_or_zone             VARCHAR(100),
    representative_embedding vector(384) NOT NULL,
    assigned_technician_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    sla_deadline             TIMESTAMP WITH TIME ZONE,
    first_reported_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_reported_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_department VARCHAR(100) NOT NULL DEFAULT 'MAINTENANCE'
);

-- ─────────────────────────────────────────────
--  COMPLAINTS  (individual student/faculty reports)
-- ─────────────────────────────────────────────
CREATE TABLE complaints (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cluster_id           UUID REFERENCES issue_clusters(id) ON DELETE SET NULL,
    title                VARCHAR(255) NOT NULL,
    description          TEXT NOT NULL,
    category             issue_category NOT NULL,
    severity             INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    image_url            VARCHAR(512),
    resolution_proof_url VARCHAR(512),
    floor                VARCHAR(10) NOT NULL,
    x_coord              FLOAT NOT NULL,
    y_coord              FLOAT NOT NULL,
    room_or_zone         VARCHAR(100),
    embedding            vector(384) NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  SLA ESCALATIONS
-- ─────────────────────────────────────────────
CREATE TABLE sla_escalations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id        UUID NOT NULL REFERENCES issue_clusters(id) ON DELETE CASCADE,
    escalation_level  INT NOT NULL DEFAULT 1,
    notified_emails   TEXT[] NOT NULL DEFAULT '{}',
    next_check_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  AUDIT LOGS  (immutable event log)
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id   UUID REFERENCES issue_clusters(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action_taken VARCHAR(100) NOT NULL,
    details      JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
--  INDEXES
-- ─────────────────────────────────────────────
-- HNSW vector index for sub-millisecond cosine similarity search
CREATE INDEX idx_clusters_hnsw
    ON issue_clusters USING hnsw (representative_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Indoor floor spatial composite index for fast area pre-filter
CREATE INDEX idx_clusters_floor_spatial ON issue_clusters (floor, x_coord, y_coord);
CREATE INDEX idx_clusters_status     ON issue_clusters (status);
CREATE INDEX idx_clusters_category   ON issue_clusters (category);
CREATE INDEX idx_complaints_cluster  ON complaints (cluster_id);
CREATE INDEX idx_complaints_user     ON complaints (user_id);
CREATE INDEX idx_audit_cluster       ON audit_logs (cluster_id);
CREATE INDEX idx_escalations_check   ON sla_escalations (next_check_at);

-- ─────────────────────────────────────────────
--  AUTO-UPDATE TRIGGER FOR updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON issue_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
