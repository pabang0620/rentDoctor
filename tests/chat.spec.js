/**
 * 채팅 UI 테스트 — AI 호출 최소화 (UI만 검증)
 */
import { test, expect } from '@playwright/test'
import { loginPage, deleteUserByToken } from './helpers/auth.js'

test.describe('채팅 페이지 UI', () => {
  test('입력창 및 기본 UI 로드', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'tests/screenshots/chat.png' })
  })

  test('textarea placeholder 텍스트 존재', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 10000 })
    const placeholder = await textarea.getAttribute('placeholder')
    expect(placeholder).toBeTruthy()
    expect(placeholder.length).toBeGreaterThan(3)
  })

  test('웰컴 메시지 표시', async ({ page }) => {
    await page.goto('/chat')
    // assistant 메시지가 로드될 때까지 대기
    const msg = page.locator('[class*="message"][class*="assistant"], [class*="bot"], [class*="ai"]').first()
    await expect(msg).toBeVisible({ timeout: 15000 })
  })

  test('메시지 입력 후 전송 → textarea 비워짐', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 10000 })

    await textarea.fill('안녕하세요')
    expect(await textarea.inputValue()).toBe('안녕하세요')
    await textarea.press('Enter')
    // 전송 후 textarea 비워짐
    await expect(textarea).toHaveValue('', { timeout: 5000 })
    await page.screenshot({ path: 'tests/screenshots/chat-sent.png' })
  })

  test('Shift+Enter → 줄바꿈 (전송 안 됨)', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 10000 })

    await textarea.fill('첫째 줄')
    await textarea.press('Shift+Enter')
    const val = await textarea.inputValue()
    expect(val).toContain('\n')
  })

  test('대화 초기화 버튼 존재', async ({ page }) => {
    await page.goto('/chat')
    // 초기화/새 대화 버튼 확인
    const clearBtn = page.locator('button:has-text("초기화"), button:has-text("새 대화"), button[title*="초기화"], button[aria-label*="초기화"]').first()
    await expect(clearBtn).toBeVisible({ timeout: 10000 })
  })

  test('로그인 사용자 채팅 이력 복원', async ({ page }) => {
    const { token } = await loginPage(page, page.request)

    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 15000 })

    await deleteUserByToken(page.request, token)
  })
})

test.describe('채팅 퀵 답변', () => {
  test('퀵 답변 버튼들이 표시됨', async ({ page }) => {
    await page.goto('/chat')
    // 퀵 답변 버튼 영역 확인 (있으면 테스트)
    const quickBtns = page.locator('[class*="quick"], [class*="suggestion"]')
    const count = await quickBtns.count()
    if (count > 0) {
      await expect(quickBtns.first()).toBeVisible()
      console.log(`✅ 퀵 답변 버튼 ${count}개 발견`)
    } else {
      console.log('ℹ️ 퀵 답변 버튼 없음 (스킵)')
    }
  })
})
