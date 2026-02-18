import { test, expect } from '@playwright/test'

test.describe('홈페이지', () => {
  test('홈페이지 로드 및 타이틀 확인', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/전세/)
    await page.screenshot({ path: 'tests/screenshots/home.png' })
  })

  test('AI 상담 링크로 채팅 페이지 이동', async ({ page }) => {
    await page.goto('/')
    await page.locator('a:has-text("AI 상담")').first().click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('피해 진단 링크로 진단 페이지 이동', async ({ page }) => {
    await page.goto('/')
    await page.locator('a:has-text("피해 진단")').first().click()
    await expect(page).toHaveURL(/\/diagnosis/)
  })
})
