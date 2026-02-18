import 'dotenv/config'
import pool from './pool.js'

const sql = `
CREATE SCHEMA IF NOT EXISTS lawyer;

CREATE TABLE IF NOT EXISTS lawyer.sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS lawyer.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES lawyer.sessions(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON lawyer.messages(session_id);

CREATE TABLE IF NOT EXISTS lawyer.diagnoses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES lawyer.sessions(id) ON DELETE SET NULL,
  checks          JSONB NOT NULL,
  additional_info TEXT,
  risk_level      VARCHAR(20),
  risk_score      INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  result          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diagnoses_session_id ON lawyer.diagnoses(session_id);

CREATE OR REPLACE FUNCTION lawyer.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON lawyer.sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON lawyer.sessions
  FOR EACH ROW EXECUTE FUNCTION lawyer.set_updated_at();
`

const client = await pool.connect()
try {
  await client.query(sql)
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'lawyer' ORDER BY table_name`)
  console.log('✅ 마이그레이션 완료:', res.rows.map(r => r.table_name).join(', '))
} finally {
  client.release()
  await pool.end()
}
