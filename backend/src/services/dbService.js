import pool from '../db/pool.js'

// ========================
// 세션
// ========================

export async function createSession(id) {
  const { rows } = await pool.query(
    `INSERT INTO lawyer.sessions (id) VALUES ($1) ON CONFLICT (id) DO UPDATE SET updated_at = NOW() RETURNING id`,
    [id]
  )
  return rows[0]
}

// ========================
// 메시지
// ========================

export async function saveMessage(sessionId, role, content) {
  // 세션 없으면 자동 생성
  await pool.query(
    `INSERT INTO lawyer.sessions (id) VALUES ($1) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
    [sessionId]
  )
  const { rows } = await pool.query(
    `INSERT INTO lawyer.messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id`,
    [sessionId, role, content]
  )
  return rows[0]
}

export async function getMessages(sessionId) {
  const { rows } = await pool.query(
    `SELECT id, role, content, created_at FROM lawyer.messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  )
  return rows
}

// ========================
// 진단
// ========================

export async function saveDiagnosis(sessionId, diagnosisInput, result) {
  const { rows } = await pool.query(
    `INSERT INTO lawyer.diagnoses (session_id, checks, additional_info, risk_level, risk_score, result)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      sessionId || null,
      JSON.stringify(diagnosisInput.checks),
      diagnosisInput.additionalInfo || null,
      result.riskLevel || null,
      result.riskScore || null,
      JSON.stringify(result)
    ]
  )
  return rows[0]
}
