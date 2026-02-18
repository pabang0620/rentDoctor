import rateLimit from 'express-rate-limit'

/**
 * 일반 API 요청 제한 (분당 60회)
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message)
  }
})

/**
 * AI 채팅 API 요청 제한 (분당 10회)
 * Claude API 비용 절감 및 남용 방지
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI 상담 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
    code: 'CHAT_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message)
  },
  keyGenerator: (req) => {
    // IP 기반 제한
    return req.ip || req.connection.remoteAddress
  }
})

/**
 * 진단 API 요청 제한 (분당 5회)
 */
export const diagnosisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '진단 요청이 너무 많습니다. 1분 후에 다시 시도해주세요.',
    code: 'DIAGNOSIS_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message)
  }
})

export default { generalLimiter, chatLimiter, diagnosisLimiter }
