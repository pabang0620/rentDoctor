import 'dotenv/config'
import pool from './pool.js'

const sql = `
-- 1. updated_at 트리거 함수
CREATE OR REPLACE FUNCTION lawyer.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 2. 사용자 테이블
CREATE TABLE IF NOT EXISTS lawyer.users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(20) UNIQUE NOT NULL,
  password   VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON lawyer.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON lawyer.users
  FOR EACH ROW EXECUTE FUNCTION lawyer.set_updated_at();

-- 3. 세션 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS lawyer.sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON lawyer.sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON lawyer.sessions
  FOR EACH ROW EXECUTE FUNCTION lawyer.set_updated_at();

-- 4. 메시지 테이블
CREATE TABLE IF NOT EXISTS lawyer.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES lawyer.sessions(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON lawyer.messages(session_id);

-- 5. 진단 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS lawyer.diagnoses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 기존 테이블에 컬럼 추가 (ADD COLUMN IF NOT EXISTS)

-- sessions: user_id
ALTER TABLE lawyer.sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES lawyer.users(id) ON DELETE SET NULL;

-- diagnoses: 모든 컬럼
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS session_id            UUID REFERENCES lawyer.sessions(id) ON DELETE SET NULL;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS user_id               UUID REFERENCES lawyer.users(id) ON DELETE SET NULL;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS registration_checked  BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS owner_identity_verified BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS registration_and_date BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS high_jeonse_rate      BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS mortgage_exists       BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS no_hug_insurance      BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS tax_delinquency       BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS corporate_owner       BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS multi_unit_building   BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS owner_unreachable     BOOLEAN;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS contract_end_date     DATE;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS risk_level            VARCHAR(20);
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS risk_score            INTEGER;
ALTER TABLE lawyer.diagnoses ADD COLUMN IF NOT EXISTS result                JSONB;

-- 7. users: 추가 정보 컬럼
ALTER TABLE lawyer.users ADD COLUMN IF NOT EXISTS name    VARCHAR(50);
ALTER TABLE lawyer.users ADD COLUMN IF NOT EXISTS address VARCHAR(200);
ALTER TABLE lawyer.users ADD COLUMN IF NOT EXISTS gender  VARCHAR(10);

-- 8. 인덱스 (컬럼 추가 이후에 생성)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON lawyer.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_session_id ON lawyer.diagnoses(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id   ON lawyer.diagnoses(user_id);
`

const client = await pool.connect()
try {
  await client.query(sql)
  const res = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'lawyer' ORDER BY table_name`
  )
  console.log('✅ 마이그레이션 완료:', res.rows.map(r => r.table_name).join(', '))
} finally {
  client.release()
  await pool.end()
}
