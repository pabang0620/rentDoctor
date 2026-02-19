/**
 * 대화 이력 페이지 테스트
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken, loginPage } from './helpers/auth.js'

const API = 'http://localhost:5000'

test.describe('대화 이력 페이지', () => {
  test('비로그인 → /history 접근 시 /login 리다이렉트', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('로그인 후 대화 이력 페이지 로드', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/history')

    await expect(page.locator('.history-title')).toContainText('대화 이력')
    await page.screenshot({ path: 'tests/screenshots/history.png' })

    await deleteUserByToken(page.request, token)
  })

  test('대화 없을 때 빈 상태 메시지', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/history')

    // 새 유저이므로 대화 없음 → 빈 상태 or 목록
    const emptyEl = page.locator('.history-empty, .history-list')
    await expect(emptyEl).toBeVisible({ timeout: 10000 })

    await deleteUserByToken(page.request, token)
  })

  test('내 계정 링크 → /mypage 이동', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/history')

    await page.locator('.history-back').click()
    await expect(page).toHaveURL(/\/mypage/, { timeout: 5000 })

    await deleteUserByToken(page.request, token)
  })

  test('채팅 시작 링크 (빈 상태일 때) → /chat', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/history')

    const chatLink = page.locator('.history-chat-link')
    if (await chatLink.isVisible({ timeout: 5000 })) {
      await chatLink.click()
      await expect(page).toHaveURL(/\/chat/)
    }

    await deleteUserByToken(page.request, token)
  })

  test('GET /api/chat/sessions → 본인 세션 목록 반환', async ({ request }) => {
    const user = uniqueUser('ses')
    const { body } = await registerUser(request, user)
    const token = body.data?.token

    const res = await request.get(`${API}/api/chat/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(Array.isArray(b.data)).toBe(true)
    console.log(`✅ 세션 ${b.data.length}개`)

    await deleteUserByToken(request, token)
  })
})
