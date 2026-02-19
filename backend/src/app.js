import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import authRouter from './routes/auth.js'
import chatRouter from './routes/chat.js'
import diagnosisRouter from './routes/diagnosis.js'
import legalRouter from './routes/legal.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimiter.js'

// 환경변수 로드
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// CORS 설정
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
app.use(cors({
  origin: (origin, callback) => {
    // 개발 환경에서는 origin 없는 요청 허용 (Postman 등)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS 오류: ${origin} 는 허용되지 않습니다.`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 기본 미들웨어
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 전역 rate limiting
app.use(generalLimiter)

// 헬스체크
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '전세사기 AI 법률 상담 서비스',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  })
})

// API 라우터
app.use('/api/auth', authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/diagnosis', diagnosisRouter)
app.use('/api/legal', legalRouter)

// 404 처리
app.use(notFoundHandler)

// 에러 처리
app.use(errorHandler)

// 서버 시작
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║     전세사기 AI 법률 상담 서비스 백엔드 시작     ║
╚════════════════════════════════════════════════╝
  포트: ${PORT}
  환경: ${process.env.NODE_ENV || 'development'}
  Gemini API: ${process.env.GEMINI_API_KEY ? '설정됨' : '미설정'}
  허용 출처: ${allowedOrigins.join(', ')}
  `)
})

export default app
