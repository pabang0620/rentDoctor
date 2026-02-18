import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { generateChatResponse, generateStreamingResponse } from '../services/aiService.js'
import { saveMessage, getMessages, getLatestUserSession } from '../services/dbService.js'
import { chatLimiter } from '../middleware/rateLimiter.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

// 메모리 세션 (AI 컨텍스트용)
const sessions = new Map()
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000

function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)
    session.lastActive = Date.now()
    return { session, isNew: false }
  }
  const newSessionId = sessionId || uuidv4()
  const session = { id: newSessionId, messages: [], createdAt: Date.now(), lastActive: Date.now() }
  sessions.set(newSessionId, session)
  return { session, isNew: true }
}

setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > MAX_SESSION_AGE) sessions.delete(id)
  }
}, 60 * 60 * 1000)

/**
 * GET /api/chat/my-history
 * 로그인 사용자의 최근 대화 이력 반환
 */
router.get('/my-history', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' })
    }

    const dbSession = await getLatestUserSession(req.user.id)
    if (!dbSession) {
      return res.json({ success: true, data: null })
    }

    const messages = await getMessages(dbSession.id)
    res.json({ success: true, data: { sessionId: dbSession.id, messages } })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/chat
 */
router.post('/', optionalAuth, chatLimiter, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: '메시지를 입력해주세요.', code: 'INVALID_MESSAGE' })
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, error: '메시지가 너무 깁니다. 2000자 이내로 입력해주세요.', code: 'MESSAGE_TOO_LONG' })
    }

    const { session, isNew } = getOrCreateSession(sessionId)
    const aiResponse = await generateChatResponse(session.messages, message.trim())

    session.messages.push(
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: aiResponse }
    )

    const userId = req.user?.id || null
    saveMessage(session.id, 'user', message.trim(), userId).catch(() => {})
    saveMessage(session.id, 'assistant', aiResponse, userId).catch(() => {})

    res.json({ success: true, data: { message: aiResponse, sessionId: session.id, isNewSession: isNew } })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/chat/stream
 */
router.post('/stream', optionalAuth, chatLimiter, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: '메시지를 입력해주세요.', code: 'INVALID_MESSAGE' })
    }

    const { session, isNew } = getOrCreateSession(sessionId)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Session-Id', session.id)

    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id, isNew })}\n\n`)

    const userId = req.user?.id || null

    await generateStreamingResponse(
      session.messages,
      message.trim(),
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
      },
      (fullText) => {
        session.messages.push(
          { role: 'user', content: message.trim() },
          { role: 'assistant', content: fullText }
        )
        saveMessage(session.id, 'user', message.trim(), userId).catch(() => {})
        saveMessage(session.id, 'assistant', fullText, userId).catch(() => {})

        res.write(`data: ${JSON.stringify({ type: 'done', sessionId: session.id })}\n\n`)
        res.end()
      }
    )
  } catch (error) {
    if (!res.headersSent) {
      next(error)
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
      res.end()
    }
  }
})

/**
 * DELETE /api/chat/session/:sessionId
 */
router.delete('/session/:sessionId', (req, res) => {
  const deleted = sessions.delete(req.params.sessionId)
  res.json({ success: true, data: { deleted } })
})

/**
 * GET /api/chat/session/:sessionId
 */
router.get('/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) {
    return res.status(404).json({ success: false, error: '세션을 찾을 수 없습니다.', code: 'SESSION_NOT_FOUND' })
  }
  res.json({ success: true, data: { sessionId: session.id, messages: session.messages, createdAt: session.createdAt } })
})

export default router
