import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { deleteUserData } from '../services/dbService.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'jeonse-guard-secret'
const JWT_EXPIRES = '7d'

const USERNAME_MIN = 3
const USERNAME_MAX = 20
const PASSWORD_MIN = 4
const PASSWORD_MAX = 20

function createToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name, address, gender } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' })
    }
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      return res.status(400).json({ success: false, error: `아이디는 ${USERNAME_MIN}~${USERNAME_MAX}자여야 합니다.` })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, error: '아이디는 영문·숫자·밑줄(_)만 사용 가능합니다.' })
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return res.status(400).json({ success: false, error: `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.` })
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: '이름을 입력해주세요.' })
    }
    if (!address?.trim()) {
      return res.status(400).json({ success: false, error: '거주지를 입력해주세요.' })
    }
    if (!gender) {
      return res.status(400).json({ success: false, error: '성별을 선택해주세요.' })
    }

    const existing = await pool.query('SELECT id FROM lawyer.users WHERE username = $1', [username])
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: '이미 사용 중인 아이디입니다.' })
    }

    const { rows } = await pool.query(
      'INSERT INTO lawyer.users (id, username, password, name, address, gender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, name, address, gender',
      [uuidv4(), username, password, name.trim(), address.trim(), gender]
    )
    const user = rows[0]
    const token = createToken(user)

    res.status(201).json({ success: true, data: { token, user: { id: user.id, username: user.username, name: user.name, address: user.address, gender: user.gender } } })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '아이디와 비밀번호를 입력해주세요.' })
    }

    const { rows } = await pool.query(
      'SELECT id, username, password FROM lawyer.users WHERE username = $1',
      [username]
    )

    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }

    const user = rows[0]
    const token = createToken(user)

    res.json({ success: true, data: { token, user: { id: user.id, username: user.username } } })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증 정보가 없습니다.' })
    }

    let payload
    try {
      payload = jwt.verify(auth.slice(7), JWT_SECRET)
    } catch {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' })
    }

    const { rows } = await pool.query(
      'SELECT id, username, name, address, gender, created_at FROM lawyer.users WHERE id = $1',
      [payload.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' })
    }

    res.json({ success: true, data: { user: rows[0] } })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/auth/me
 * 회원 탈퇴
 */
router.delete('/me', async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증 정보가 없습니다.' })
    }

    let payload
    try {
      payload = jwt.verify(auth.slice(7), JWT_SECRET)
    } catch {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' })
    }

    await deleteUserData(payload.userId)
    res.json({ success: true, data: { message: '회원 탈퇴가 완료되었습니다.' } })
  } catch (error) {
    next(error)
  }
})

export default router
