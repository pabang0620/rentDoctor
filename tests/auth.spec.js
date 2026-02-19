/**
 * 인증 UI 테스트 (로그인 / 회원가입 / 로그아웃)
 * 각 테스트는 고유 유저를 생성하므로 병렬 안전
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken, loginPage } from './helpers/auth.js'

const API = 'http://localhost:5000'

// ─── 로그인 페이지 UI ──────────────────────────────────────
test.describe('로그인 페이지', () => {
  test('로그인 폼 렌더링', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('.auth-title')).toContainText('로그인')
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/login.png' })
  })

  test('빈 폼 제출 → 에러', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.auth-error')).toBeVisible()
  })

  test('틀린 비밀번호 → 에러 메시지', async ({ page }) => {
    const user = uniqueUser('ui_login')
    const { body } = await registerUser(page.request, user)
    const token = body.data?.token

    await page.goto('/login')
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[type="password"]', 'wrongpw')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10000 })

    await deleteUserByToken(page.request, token)
  })

  test('정상 로그인 → 홈 리다이렉트', async ({ page }) => {
    const user = uniqueUser('ui_login_ok')
    const { body } = await registerUser(page.request, user)
    const token = body.data?.token

    await page.goto('/login')
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[type="password"]', user.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })

    await deleteUserByToken(page.request, token)
  })

  test('회원가입 링크 → /register', async ({ page }) => {
    await page.goto('/login')
    await page.locator('a[href="/register"]').click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── 회원가입 페이지 UI ────────────────────────────────────
test.describe('회원가입 페이지', () => {
  test('회원가입 폼 렌더링 (5개 필드)', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('.auth-title')).toContainText('회원가입')
    // 이름, 성별(select), 거주지, 아이디, 비밀번호
    const inputs = page.locator('.auth-input')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(4)
    await page.screenshot({ path: 'tests/screenshots/register.png' })
  })

  test('성별 선택 옵션 3개', async ({ page }) => {
    await page.goto('/register')
    const options = page.locator('select.auth-input option')
    // 선택해주세요 + 남성 + 여성 + 기타
    await expect(options).toHaveCount(4)
  })

  test('빈 폼 제출 → 에러', async ({ page }) => {
    await page.goto('/register')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 5000 })
  })

  test('정상 회원가입 → 홈 리다이렉트 + 토큰 저장', async ({ page }) => {
    const user = uniqueUser('ui_reg')
    await page.goto('/register')
    await page.fill('input[placeholder="실명을 입력해주세요"]', user.name)
    await page.selectOption('select.auth-input', '기타')
    await page.fill('input[placeholder*="거주지"]', user.address)
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[autocomplete="new-password"]', user.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })

    // localStorage에 token 저장 확인
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()

    await deleteUserByToken(page.request, token)
  })
})

// ─── 로그인 상태 확인 ──────────────────────────────────────
test.describe('로그인 상태', () => {
  test('로그인 시 헤더에 이름 + 로그아웃 버튼 표시', async ({ page }) => {
    const { user, token } = await loginPage(page, page.request)

    const username = page.locator('.header-username')
    await expect(username).toBeVisible()
    const logoutBtn = page.locator('.header-logout')
    await expect(logoutBtn).toBeVisible()

    await deleteUserByToken(page.request, token)
  })

  test('로그아웃 → 로그인 버튼으로 교체', async ({ page }) => {
    const { token } = await loginPage(page, page.request)

    await page.locator('.header-logout').click()
    await expect(page.locator('.header-login-btn')).toBeVisible({ timeout: 5000 })

    await deleteUserByToken(page.request, token)
  })

  test('로그인 후 마이페이지(/mypage) 접근 가능', async ({ page }) => {
    const { token } = await loginPage(page, page.request)

    await page.goto('/mypage')
    await expect(page.locator('.mypage-title')).toContainText('내 계정')
    await page.screenshot({ path: 'tests/screenshots/mypage.png' })

    await deleteUserByToken(page.request, token)
  })
})
