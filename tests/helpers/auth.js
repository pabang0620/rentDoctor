/**
 * 테스트용 공통 인증 헬퍼
 * 각 워커가 고유 유저를 생성하므로 병렬 실행 시 충돌 없음
 */
const API = 'http://localhost:5000'

export function uniqueUser(prefix = 'tst') {
  // 최대 20자 보장: prefix 최대 3자 + base36 timestamp 7자 + 랜덤 3자 = 13자
  const p = prefix.slice(0, 3)
  const ts = Date.now().toString(36).slice(-6)  // 6자
  const rnd = Math.random().toString(36).slice(2, 5) // 3자
  return {
    username: `${p}${ts}${rnd}`,   // 최대 12자
    password: 'test1234',
    name: '테스트유저',
    address: '서울시 강남구',
    gender: '기타',
  }
}

export async function registerUser(request, user) {
  const res = await request.post(`${API}/api/auth/register`, { data: user })
  const body = await res.json()
  if (res.status() !== 201) {
    console.error(`[registerUser] ${res.status()} username=${user.username}`, body)
  }
  return { status: res.status(), body }
}

export async function loginUser(request, username, password) {
  const res = await request.post(`${API}/api/auth/login`, {
    data: { username, password },
  })
  const body = await res.json()
  return { status: res.status(), body, token: body.data?.token }
}

export async function deleteUserByToken(request, token) {
  if (!token) return
  await request.delete(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** 로그인 상태의 page 반환 (localStorage에 token 설정) */
export async function loginPage(page, request) {
  const user = uniqueUser('ui')
  const { body: reg } = await registerUser(request, user)
  const token = reg.data?.token
  if (!token) throw new Error(`회원가입 실패: ${JSON.stringify(reg)}`)

  await page.goto('/')
  await page.evaluate((t) => localStorage.setItem('token', t), token)
  await page.reload()
  return { user, token }
}
