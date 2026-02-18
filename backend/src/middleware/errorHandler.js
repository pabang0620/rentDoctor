/**
 * 전역 에러 핸들러 미들웨어
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message)
  console.error(err.stack)

  // Anthropic API 에러
  if (err.name === 'AnthropicError' || err.status) {
    if (err.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'API 인증에 실패했습니다. API 키를 확인해주세요.',
        code: 'AUTH_ERROR'
      })
    }
    if (err.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        code: 'RATE_LIMIT_ERROR'
      })
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청입니다. 입력 내용을 확인해주세요.',
        code: 'BAD_REQUEST'
      })
    }
  }

  // 유효성 검사 에러
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR'
    })
  }

  // 기본 서버 에러
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      : err.message,
    code: 'SERVER_ERROR'
  })
}

/**
 * 404 핸들러
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `요청하신 경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    code: 'NOT_FOUND'
  })
}

export default { errorHandler, notFoundHandler }
