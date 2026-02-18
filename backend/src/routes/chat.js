import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { generateChatResponse, generateStreamingResponse } from '../services/aiService.js'
import { saveMessage, getMessages } from '../services/dbService.js'
import { chatLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// 메모리 기반 세션 저장 (실제 서비스에서는 DB 사용)
const sessions = new Map()

const MAX_SESSION_AGE = 24 * 60 * 60 * 1000 // 24시간

/**
 * 세션 관리 헬퍼
 */
function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)
    session.lastActive = Date.now()
    return { session, isNew: false }
  }

  const newSessionId = uuidv4()
  const session = {
    id: newSessionId,
    messages: [],
    createdAt: Date.now(),
    lastActive: Date.now()
  }
  sessions.set(newSessionId, session)
  return { session, isNew: true }
}

// 만료된 세션 정리 (1시간마다)
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > MAX_SESSION_AGE) {
      sessions.delete(id)
    }
  }
}, 60 * 60 * 1000)

/**
 * POST /api/chat
 * 일반 채팅 응답
 */
router.post('/', chatLimiter, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '메시지를 입력해주세요.',
        code: 'INVALID_MESSAGE'
      })
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: '메시지가 너무 깁니다. 2000자 이내로 입력해주세요.',
        code: 'MESSAGE_TOO_LONG'
      })
    }

    const { session, isNew } = getOrCreateSession(sessionId)

    // AI 응답 생성
    const aiResponse = await generateChatResponse(session.messages, message.trim())

    // 메모리 히스토리 업데이트
    session.messages.push(
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: aiResponse }
    )

    // DB에 비동기 저장 (응답 속도에 영향 없음)
    saveMessage(session.id, 'user', message.trim()).catch(() => {})
    saveMessage(session.id, 'assistant', aiResponse).catch(() => {})

    res.json({
      success: true,
      data: {
        message: aiResponse,
        sessionId: session.id,
        isNewSession: isNew
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/chat/stream
 * 스트리밍 채팅 응답 (Server-Sent Events)
 */
router.post('/stream', chatLimiter, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '메시지를 입력해주세요.',
        code: 'INVALID_MESSAGE'
      })
    }

    const { session, isNew } = getOrCreateSession(sessionId)

    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Session-Id', session.id)

    // 세션 ID 전송
    res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id, isNew })}\n\n`)

    await generateStreamingResponse(
      session.messages,
      message.trim(),
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
      },
      (fullText) => {
        // 메모리 히스토리 업데이트
        session.messages.push(
          { role: 'user', content: message.trim() },
          { role: 'assistant', content: fullText }
        )
        // DB에 비동기 저장
        saveMessage(session.id, 'user', message.trim()).catch(() => {})
        saveMessage(session.id, 'assistant', fullText).catch(() => {})

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
 * 세션 삭제
 */
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const deleted = sessions.delete(sessionId)

  res.json({
    success: true,
    data: { deleted }
  })
})

/**
 * GET /api/chat/session/:sessionId
 * 세션 히스토리 조회
 */
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const session = sessions.get(sessionId)

  if (!session) {
    return res.status(404).json({
      success: false,
      error: '세션을 찾을 수 없습니다.',
      code: 'SESSION_NOT_FOUND'
    })
  }

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      messages: session.messages,
      createdAt: session.createdAt
    }
  })
})

export default router
