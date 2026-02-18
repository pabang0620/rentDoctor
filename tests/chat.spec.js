import { test, expect } from '@playwright/test'

test.describe('AI 채팅', () => {
  test('채팅 페이지 로드 및 입력창 확인', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 10000 })
    await expect(textarea).toHaveAttribute('placeholder', /전세사기/)
    await page.screenshot({ path: 'tests/screenshots/chat-load.png' })
  })

  test('메시지 입력 후 Enter 전송', async ({ page }) => {
    await page.goto('/chat')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5000 })

    await textarea.fill('전입신고를 하면 대항력이 생기나요?')
    await textarea.press('Enter')

    // 전송 후 textarea가 비워지면 전송된 것
    await expect(textarea).toHaveValue('', { timeout: 5000 })
    await page.screenshot({ path: 'tests/screenshots/chat-sent.png' })
  })

  test('API - 채팅 응답 및 세션ID 반환', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/chat', {
      data: { message: '대항력이 뭔가요?' },
    })
    // 429(rate limit)이면 건너뜀
    if (response.status() === 429) {
      test.skip()
      return
    }
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.sessionId).toBeTruthy()
    expect(body.data.message.length).toBeGreaterThan(10)
    console.log('✅ sessionId:', body.data.sessionId)
    console.log('✅ 응답 길이:', body.data.message.length, '자')
  })
})
