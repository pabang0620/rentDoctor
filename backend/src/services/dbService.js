import pool from '../db/pool.js'

// ========================
// 세션
// ========================

export async function createSession(id, userId = null) {
  const { rows } = await pool.query(
    `INSERT INTO lawyer.sessions (id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [id, userId]
  )
  return rows[0]
}

export async function getLatestUserSession(userId) {
  const { rows } = await pool.query(
    `SELECT id FROM lawyer.sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  )
  return rows[0] || null
}

// ========================
// 메시지
// ========================

export async function saveMessage(sessionId, role, content, userId = null) {
  await pool.query(
    `INSERT INTO lawyer.sessions (id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
    [sessionId, userId]
  )
  const { rows } = await pool.query(
    `INSERT INTO lawyer.messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id`,
    [sessionId, role, content]
  )
  return rows[0]
}

export async function getMessages(sessionId) {
  const { rows } = await pool.query(
    `SELECT id, role, content, created_at
     FROM lawyer.messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  )
  return rows
}

// ========================
// 진단
// ========================

export async function saveDiagnosis(sessionId, checks, contractEndDate, result, userId = null) {
  const { rows } = await pool.query(
    `INSERT INTO lawyer.diagnoses (
      session_id, user_id,
      registration_checked, owner_identity_verified, registration_and_date,
      high_jeonse_rate, mortgage_exists, no_hug_insurance,
      tax_delinquency, corporate_owner, multi_unit_building, owner_unreachable,
      contract_end_date,
      risk_level, risk_score, result
    ) VALUES (
      $1, $2,
      $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      $13,
      $14, $15, $16
    ) RETURNING id`,
    [
      sessionId || null,
      userId || null,
      checks.registrationChecked    ?? null,
      checks.ownerIdentityVerified  ?? null,
      checks.registrationAndDate    ?? null,
      checks.highJeonseRate         ?? null,
      checks.mortgageExists         ?? null,
      checks.noHugInsurance         ?? null,
      checks.taxDelinquency         ?? null,
      checks.corporateOwner         ?? null,
      checks.multiUnitBuilding      ?? null,
      checks.ownerUnreachable       ?? null,
      contractEndDate || null,
      result.riskLevel  || null,
      result.riskScore  || null,
      JSON.stringify(result)
    ]
  )
  return rows[0]
}
