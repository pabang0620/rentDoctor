/**
 * 백엔드 API 테스트 — 브라우저 불필요, 가장 빠름
 * 병렬 실행에 최적화
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, loginUser, deleteUserByToken } from './helpers/auth.js'

const API = 'http://localhost:5000'

// ─── 공통 인프라 ───────────────────────────────────────────
test.describe('서버 헬스', () => {
  test('GET /health → ok + gemini 활성', async ({ request }) => {
    const res = await request.get(`${API}/health`)
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.status).toBe('ok')
    expect(b.geminiConfigured).toBe(true)
    console.log('✅ Gemini 활성화:', b.geminiConfigured)
  })
})

// ─── 인증 API ──────────────────────────────────────────────
test.describe('인증 API', () => {
  test('회원가입 성공 → 201 + token', async ({ request }) => {
    const user = uniqueUser('reg')
    const { status, body } = await registerUser(request, user)
    expect(status).toBe(201)
    expect(body.data.token).toBeTruthy()
    expect(body.data.user.username).toBe(user.username)
    await deleteUserByToken(request, body.data.token)
  })

  test('중복 아이디 → 409', async ({ request }) => {
    const user = uniqueUser('dup')
    const { body } = await registerUser(request, user)
    const res2 = await request.post(`${API}/api/auth/register`, { data: user })
    expect(res2.status()).toBe(409)
    await deleteUserByToken(request, body.data.token)
  })

  test('짧은 아이디(2자) → 400', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/register`, {
      data: { username: 'ab', password: '1234', name: '홍길동', address: '서울', gender: '남성' },
    })
    expect(res.status()).toBe(400)
  })

  test('이름 없이 가입 → 400', async ({ request }) => {
    const user = uniqueUser('noname')
    const res = await request.post(`${API}/api/auth/register`, {
      data: { ...user, name: '' },
    })
    expect(res.status()).toBe(400)
  })

  test('성별 없이 가입 → 400', async ({ request }) => {
    const user = uniqueUser('nogender')
    const res = await request.post(`${API}/api/auth/register`, {
      data: { ...user, gender: '' },
    })
    expect(res.status()).toBe(400)
  })

  test('로그인 성공 → token 반환', async ({ request }) => {
    const user = uniqueUser('login')
    const { body: reg } = await registerUser(request, user)
    const { status, body } = await loginUser(request, user.username, user.password)
    expect(status).toBe(200)
    expect(body.data.token).toBeTruthy()
    await deleteUserByToken(request, reg.data.token)
  })

  test('틀린 비밀번호 → 401', async ({ request }) => {
    const user = uniqueUser('wrongpw')
    const { body: reg } = await registerUser(request, user)
    const { status } = await loginUser(request, user.username, 'wrongpassword')
    expect(status).toBe(401)
    await deleteUserByToken(request, reg.data.token)
  })

  test('존재하지 않는 아이디 → 401', async ({ request }) => {
    const { status } = await loginUser(request, 'nonexistent_xyz_999', 'pw')
    expect(status).toBe(401)
  })

  test('GET /auth/me → 유저 정보 반환', async ({ request }) => {
    const user = uniqueUser('me')
    const { body: reg } = await registerUser(request, user)
    const token = reg.data.token
    const res = await request.get(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.user.username).toBe(user.username)
    expect(b.data.user.name).toBe(user.name)
    await deleteUserByToken(request, token)
  })

  test('토큰 없이 GET /auth/me → 401', async ({ request }) => {
    const res = await request.get(`${API}/api/auth/me`)
    expect(res.status()).toBe(401)
  })

  test('DELETE /auth/me → 회원 탈퇴 성공', async ({ request }) => {
    const user = uniqueUser('del')
    const { body: reg } = await registerUser(request, user)
    const token = reg.data.token
    const res = await request.delete(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    // 탈퇴 후 로그인 불가
    const { status } = await loginUser(request, user.username, user.password)
    expect(status).toBe(401)
  })
})

// ─── 진단 API ──────────────────────────────────────────────
test.describe('진단 API', () => {
  const highRisk = {
    registrationChecked: false, ownerIdentityVerified: false,
    registrationAndDate: false, highJeonseRate: true,
    mortgageExists: true, noHugInsurance: true,
    taxDelinquency: true, corporateOwner: false,
    multiUnitBuilding: true, ownerUnreachable: true,
  }
  const lowRisk = {
    registrationChecked: true, ownerIdentityVerified: true,
    registrationAndDate: true, highJeonseRate: false,
    mortgageExists: false, noHugInsurance: false,
    taxDelinquency: false, corporateOwner: false,
    multiUnitBuilding: false, ownerUnreachable: false,
  }

  test('체크리스트 10개 항목 조회', async ({ request }) => {
    const res = await request.get(`${API}/api/diagnosis/checklist`)
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.items.length).toBe(10)
  })

  test('고위험 진단 → 높음 이상', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: highRisk } })
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.riskScore).toBeGreaterThanOrEqual(70)
    expect(['높음', '매우높음']).toContain(b.data.riskLevel)
    expect(b.data.immediateActions.length).toBeGreaterThan(0)
    console.log(`✅ 고위험: ${b.data.riskLevel} (${b.data.riskScore}점)`)
  })

  test('저위험 진단 → 낮음', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: lowRisk } })
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.riskScore).toBeLessThan(30)
    console.log(`✅ 저위험: ${b.data.riskLevel} (${b.data.riskScore}점)`)
  })

  test('checks 없이 → 400', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: {} })
    expect(res.status()).toBe(400)
  })

  test('계약만료일 포함 진단', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, {
      data: { checks: highRisk, contractEndDate: '2024-01-01' },
    })
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.riskLevel).toBeTruthy()
  })
})

// ─── 법령 API ──────────────────────────────────────────────
test.describe('법령 API', () => {
  test('법령 목록 9개 조회', async ({ request }) => {
    const res = await request.get(`${API}/api/legal/laws`)
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.laws.length).toBe(9)
  })

  test('대항력 검색 → 결과 있음', async ({ request }) => {
    const res = await request.get(`${API}/api/legal/search?q=대항력`)
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.laws.length).toBeGreaterThan(0)
    console.log(`✅ "대항력" 법령 ${b.data.laws.length}개`)
  })

  test('임차권 검색 → 결과 있음', async ({ request }) => {
    const res = await request.get(`${API}/api/legal/search?q=임차권`)
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.laws.length).toBeGreaterThan(0)
  })

  test('검색 쿼리 없으면 → 400', async ({ request }) => {
    const res = await request.get(`${API}/api/legal/search`)
    expect(res.status()).toBe(400)
  })
})

// ─── 채팅 API ─ (AI 호출 최소화: 1회만) ────────────────────
test.describe('채팅 API', () => {
  test('2001자 메시지 → 400', async ({ request }) => {
    const res = await request.post(`${API}/api/chat`, {
      data: { message: 'a'.repeat(2001) },
    })
    expect(res.status()).toBe(400)
  })

  test('빈 메시지 → 400', async ({ request }) => {
    const res = await request.post(`${API}/api/chat`, {
      data: { message: '   ' },
    })
    expect(res.status()).toBe(400)
  })

  test('없는 세션 ID → 404', async ({ request }) => {
    const res = await request.get(
      `${API}/api/chat/session/00000000-0000-0000-0000-000000000000`
    )
    expect(res.status()).toBe(404)
  })

  test('GET /chat/sessions 인증 없으면 → 401', async ({ request }) => {
    const res = await request.get(`${API}/api/chat/sessions`)
    expect(res.status()).toBe(401)
  })

  test('GET /chat/history/:id 인증 없으면 → 401', async ({ request }) => {
    const res = await request.get(`${API}/api/chat/history/some-id`)
    expect(res.status()).toBe(401)
  })

  test('AI 채팅 응답 (1회)', async ({ request }) => {
    const res = await request.post(`${API}/api/chat`, {
      data: { message: '전세사기 피해 시 가장 먼저 해야 할 일이 뭔가요?' },
      timeout: 45000,
    })
    if (res.status() === 429) { test.skip(); return }
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.sessionId).toBeTruthy()
    expect(b.data.message.length).toBeGreaterThan(20)
    console.log(`✅ AI 응답 ${b.data.message.length}자`)
  })
})
