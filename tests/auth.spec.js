/**
 * 인증 UI 테스트 (로그인 / 회원가입 / 로그아웃)
 * 로그인 상태 테스트는 beforeAll 1유저 공유 → rate limit 절약
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken } from './helpers/auth.js'

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

  test('틀린 비밀번호 → 에러 메시지', async ({ page, request }) => {
    const user = uniqueUser('lge')
    const { body } = await registerUser(request, user)
    const token = body.data?.token

    await page.goto('/login')
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[type="password"]', 'wrongpw')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10000 })

    await deleteUserByToken(request, token)
  })

  test('정상 로그인 → 홈 리다이렉트', async ({ page, request }) => {
    const user = uniqueUser('lok')
    const { body } = await registerUser(request, user)
    const token = body.data?.token

    await page.goto('/login')
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[type="password"]', user.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })

    await deleteUserByToken(request, token)
  })

  test('회원가입 링크 → /register', async ({ page }) => {
    await page.goto('/login')
    await page.locator('a[href="/register"]').click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── 회원가입 페이지 UI ────────────────────────────────────
test.describe('회원가입 페이지', () => {
  test('회원가입 폼 렌더링 (필드 4개 이상)', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('.auth-title')).toContainText('회원가입')
    const inputs = page.locator('.auth-input')
    expect(await inputs.count()).toBeGreaterThanOrEqual(4)
    await page.screenshot({ path: 'tests/screenshots/register.png' })
  })

  test('성별 선택 옵션 4개 (선택포함)', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('select.auth-input option')).toHaveCount(4)
  })

  test('빈 폼 제출 → 에러', async ({ page }) => {
    await page.goto('/register')
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 5000 })
  })

  test('정상 회원가입 → 홈 리다이렉트 + 토큰 저장', async ({ page, request }) => {
    const user = uniqueUser('rgk')
    await page.goto('/register')
    await page.fill('input[placeholder="실명을 입력해주세요"]', user.name)
    await page.selectOption('select.auth-input', '기타')
    await page.locator('.auth-field').filter({ hasText: '거주지' }).locator('input').fill(user.address)
    await page.fill('input[autocomplete="username"]', user.username)
    await page.fill('input[autocomplete="new-password"]', user.password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()
    await deleteUserByToken(request, token)
  })
})

// ─── 로그인 상태 (1유저 공유) ─────────────────────────────
test.describe('로그인 상태', () => {
  let sharedToken
  let sharedUser

  test.beforeAll(async ({ request }) => {
    sharedUser = uniqueUser('lgd')
    const { body } = await registerUser(request, sharedUser)
    sharedToken = body.data?.token
    if (!sharedToken) throw new Error(`유저 생성 실패: ${JSON.stringify(body)}`)
  })

  test.afterAll(async ({ request }) => {
    await deleteUserByToken(request, sharedToken)
  })

  async function loginPage(page) {
    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('token', t), sharedToken)
    await page.reload()
  }

  test('헤더에 이름 + 로그아웃 버튼 표시', async ({ page }) => {
    await loginPage(page)
    await expect(page.locator('.header-username')).toBeVisible()
    await expect(page.locator('.header-logout')).toBeVisible()
  })

  test('로그아웃 → 로그인 버튼 표시', async ({ page }) => {
    await loginPage(page)
    await page.locator('.header-logout').click()
    await expect(page.locator('.header-login-btn')).toBeVisible({ timeout: 5000 })
  })

  test('마이페이지(/mypage) 접근 가능', async ({ page }) => {
    await loginPage(page)
    await page.goto('/mypage')
    await expect(page.locator('.mypage-title')).toContainText('내 계정')
    await page.screenshot({ path: 'tests/screenshots/mypage.png' })
  })
})
