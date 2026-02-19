/**
 * 홈페이지 + 내비게이션 UI 테스트
 */
import { test, expect } from '@playwright/test'

test.describe('홈페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('타이틀에 "전세" 포함', async ({ page }) => {
    await expect(page).toHaveTitle(/전세/)
    await page.screenshot({ path: 'tests/screenshots/home.png' })
  })

  test('헤더 로고 표시', async ({ page }) => {
    const logo = page.locator('.header-logo')
    await expect(logo).toBeVisible()
  })

  test('헤더 네비게이션 링크 3개 (홈/상담/진단)', async ({ page }) => {
    const navLinks = page.locator('.header-nav-link')
    await expect(navLinks).toHaveCount(3)
  })

  test('법률상담 132 전화 링크 존재', async ({ page }) => {
    const tel = page.locator('a[href="tel:132"]').first()
    await expect(tel).toBeVisible()
  })

  test('AI 상담 링크 → /chat 이동', async ({ page }) => {
    await page.locator('a[href="/chat"]').first().click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('위험 진단 링크 → /diagnosis 이동', async ({ page }) => {
    await page.locator('a[href="/diagnosis"]').first().click()
    await expect(page).toHaveURL(/\/diagnosis/)
  })

  test('로그인 버튼 → /login 이동', async ({ page }) => {
    await page.locator('.header-login-btn').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('없는 경로 → 404 페이지', async ({ page }) => {
    await page.goto('/not-exist-page')
    await expect(page.locator('h2')).toContainText('페이지를 찾을 수 없습니다')
  })
})
