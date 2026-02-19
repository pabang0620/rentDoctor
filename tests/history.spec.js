/**
 * 대화 이력 페이지 테스트
 * beforeAll에서 1개 유저 생성 → 전체 describe 공유
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken } from './helpers/auth.js'

const API = 'http://localhost:5000'

test.describe('대화 이력 페이지', () => {
  let sharedToken

  test.beforeAll(async ({ request }) => {
    const user = uniqueUser('his')
    const { body } = await registerUser(request, user)
    sharedToken = body.data?.token
    if (!sharedToken) throw new Error(`유저 생성 실패: ${JSON.stringify(body)}`)
  })

  test.afterAll(async ({ request }) => {
    await deleteUserByToken(request, sharedToken)
  })

  async function loginWithShared(page) {
    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('token', t), sharedToken)
    await page.reload()
  }

  test('비로그인 → /history 접근 시 /login 리다이렉트', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('로그인 후 대화 이력 페이지 로드', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/history')
    await expect(page.locator('.history-title')).toContainText('대화 이력')
    await page.screenshot({ path: 'tests/screenshots/history.png' })
  })

  test('대화 없을 때 빈 상태 or 목록 표시', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/history')
    const emptyOrList = page.locator('.history-empty, .history-list')
    await expect(emptyOrList).toBeVisible({ timeout: 10000 })
  })

  test('내 계정 링크 → /mypage 이동', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/history')
    await page.locator('.history-back').click()
    await expect(page).toHaveURL(/\/mypage/, { timeout: 5000 })
  })

  test('빈 상태일 때 채팅 시작 링크 → /chat', async ({ page }) => {
    await loginWithShared(page)
    await page.goto('/history')
    const chatLink = page.locator('.history-chat-link')
    if (await chatLink.isVisible({ timeout: 5000 })) {
      await chatLink.click()
      await expect(page).toHaveURL(/\/chat/)
    }
  })

  test('GET /api/chat/sessions → 본인 세션 목록 반환', async ({ request }) => {
    const res = await request.get(`${API}/api/chat/sessions`, {
      headers: { Authorization: `Bearer ${sharedToken}` },
    })
    if (res.status() === 429) { test.skip(); return }
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(Array.isArray(b.data)).toBe(true)
    console.log(`✅ 세션 ${b.data.length}개`)
  })
})
