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

// 개인정보처리방침 (Play Store 등록용 공개 URL)
app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>개인정보처리방침 - 전세닥터</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; color: #1e293b; line-height: 1.7; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #0f172a; padding-bottom: 0.75rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; color: #0f172a; }
    p, li { font-size: 0.95rem; color: #334155; }
    ul { padding-left: 1.25rem; }
    .updated { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>개인정보처리방침</h1>
  <p class="updated">최종 업데이트: 2026년 1월 1일</p>

  <h2>1. 수집하는 개인정보</h2>
  <p>전세닥터(이하 "서비스")는 다음의 개인정보를 수집합니다.</p>
  <ul>
    <li><strong>회원가입 시:</strong> 이메일 주소, 사용자명(닉네임), 비밀번호(암호화 저장)</li>
    <li><strong>서비스 이용 시:</strong> AI와의 대화 내용, 위험도 진단 체크리스트 응답</li>
    <li><strong>자동 수집:</strong> 서버 접속 로그(IP 주소, 접속 시간, 브라우저 정보)</li>
  </ul>
  <p>회원가입 없이 서비스를 이용할 수 있으며, 비회원 이용 시 대화 내용은 서버에 저장되지 않습니다.</p>

  <h2>2. 개인정보 수집 및 이용 목적</h2>
  <ul>
    <li>전세사기 피해 상담 서비스 제공</li>
    <li>회원 식별 및 로그인 처리</li>
    <li>대화 이력 저장 및 복원 (로그인 회원에 한함)</li>
    <li>서비스 품질 개선 및 이상 접근 탐지</li>
  </ul>

  <h2>3. 개인정보 보유 및 이용 기간</h2>
  <ul>
    <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 보유, 탈퇴 후 즉시 파기</li>
    <li><strong>대화 이력:</strong> 회원이 '새 대화 시작'을 누르거나 탈퇴 시 파기</li>
    <li><strong>접속 로그:</strong> 3개월간 보유 후 자동 삭제</li>
  </ul>

  <h2>4. 개인정보 제3자 제공</h2>
  <p>서비스는 수집한 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령의 규정에 의한 경우는 예외입니다.</p>

  <h2>5. AI 서비스 관련 정보 처리</h2>
  <p>이용자가 입력한 질문 내용은 AI 응답 생성을 위해 Google의 Gemma 모델 API에 전송됩니다. 이 과정에서 이름·연락처 등 민감한 개인 식별 정보는 입력하지 않도록 권고합니다.</p>

  <h2>6. 이용자의 권리</h2>
  <ul>
    <li>본인의 개인정보 열람·정정·삭제 요청</li>
    <li>개인정보 처리 정지 요청</li>
    <li>회원 탈퇴를 통한 개인정보 일괄 삭제</li>
  </ul>

  <h2>7. 개인정보 보호를 위한 기술적 조치</h2>
  <ul>
    <li>비밀번호는 단방향 암호화(bcrypt)하여 저장</li>
    <li>API 통신 시 HTTPS 암호화 적용</li>
    <li>JWT 토큰을 통한 인증 관리</li>
  </ul>

  <h2>8. 문의</h2>
  <p>개인정보 침해 신고: <strong>개인정보보호위원회 (국번없이 182)</strong></p>
</body>
</html>`)
})

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
