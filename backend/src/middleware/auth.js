import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'jeonse-guard-secret'

/**
 * 선택적 인증 미들웨어
 * - 유효한 토큰이 있으면 req.user 에 { id, username } 을 붙임
 * - 토큰이 없거나 유효하지 않아도 요청을 막지 않음
 */
export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET)
      req.user = { id: payload.userId, username: payload.username }
    } catch {
      // 유효하지 않은 토큰 → 익명 처리
    }
  }
  next()
}
