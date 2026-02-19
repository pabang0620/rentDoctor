/**
 * 마이페이지 + 회원 탈퇴 테스트
 * beforeAll에서 1개 유저 생성 → 전체 describe 공유 (rate limit 절약)
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken } from './helpers/auth.js'

const API = 'http://localhost:5000'

test.describe('마이페이지', () => {
  let sharedToken
  let sharedUser

  test.beforeAll(async ({ request }) => {
    sharedUser = uniqueUser('mp')
    const { body } = await registerUser(request, sharedUser)
    sharedToken = body.data?.token
    if (!sharedToken) throw new Error(`유저 생성 실패: ${JSON.stringify(body)}`)
  })

  test.afterAll(async ({ request }) => {
    await deleteUserByToken(request, sharedToken)
  })

  /** 공유 유저로 page 로그인 */
  async function loginWithShared(page) {
    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('token', t), sharedToken)
    await page.reload()
  }

  // ── 비로그인 접근 ──────────────────────────────────────
  test('비로그인 → /mypage 접근 시 /login 리다이렉트', async ({ page }) => {
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  // ── 로그인 후 UI ───────────────────────────────────────
  test('계정 정보 표시 (이름, 아이디, 거주지, 성별)', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/mypage')
    await expect(page.locator('.mypage-title')).toContainText('내 계정')
    await expect(page.locator('.mypage-card')).toContainText(sharedUser.name)
    await expect(page.locator('.mypage-card')).toContainText(sharedUser.username)
    await expect(page.locator('.mypage-card')).toContainText(sharedUser.address)
    await expect(page.locator('.mypage-card')).toContainText('기타')
    await page.screenshot({ path: 'tests/screenshots/mypage-info.png' })
  })

  test('대화 이력 보기 링크 → /history', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/mypage')
    await page.locator('.mypage-history-link').click()
    await expect(page).toHaveURL(/\/history/, { timeout: 5000 })
  })

  test('로그아웃 버튼 → 홈 이동 + 로그인 버튼 표시', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/mypage')
    await page.locator('.mypage-logout-btn').click()
    await expect(page).toHaveURL('/', { timeout: 5000 })
    await expect(page.locator('.header-login-btn')).toBeVisible()
  })

  test('회원 탈퇴 버튼 → 확인 모달 → 취소', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/mypage')
    await page.locator('.mypage-delete-btn').click()
    await expect(page.locator('.mypage-confirm-box')).toBeVisible()
    await expect(page.locator('.mypage-confirm-title')).toContainText('탈퇴')
    await page.screenshot({ path: 'tests/screenshots/mypage-confirm.png' })
    // 취소
    await page.locator('.mypage-confirm-cancel').click()
    await expect(page.locator('.mypage-confirm-box')).not.toBeVisible()
  })
})

// ── 탈퇴 테스트는 별도 유저 사용 (전용 teardown 없이 자체 삭제됨) ──
test.describe('회원 탈퇴 실행', () => {
  test('탈퇴 확인 → 홈 이동 + 로그아웃 상태', async ({ page, request }) => {
    const user = uniqueUser('del')
    const { body } = await registerUser(request, user)
    const token = body.data?.token
    if (!token) { test.skip(); return }

    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('token', t), token)
    await page.reload()

    await page.goto('/mypage')
    await expect(page.locator('.mypage-delete-btn')).toBeVisible({ timeout: 10000 })
    await page.locator('.mypage-delete-btn').click()
    await expect(page.locator('.mypage-confirm-box')).toBeVisible()
    await page.locator('.mypage-confirm-ok').click()

    await expect(page).toHaveURL('/', { timeout: 15000 })
    await expect(page.locator('.header-login-btn')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'tests/screenshots/mypage-deleted.png' })
  })
})
