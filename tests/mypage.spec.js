/**
 * 마이페이지 + 회원 탈퇴 테스트
 */
import { test, expect } from '@playwright/test'
import { uniqueUser, registerUser, deleteUserByToken, loginPage } from './helpers/auth.js'

const API = 'http://localhost:5000'

test.describe('마이페이지', () => {
  test('비로그인 → /mypage 접근 시 /login 리다이렉트', async ({ page }) => {
    await page.goto('/mypage')
    // 로그인 페이지로 리다이렉트되거나 로그인 폼 표시
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('로그인 시 계정 정보 표시', async ({ page }) => {
    const { user, token } = await loginPage(page, page.request)
    await page.goto('/mypage')

    await expect(page.locator('.mypage-title')).toContainText('내 계정')
    // 이름 표시 확인
    await expect(page.locator('.mypage-card')).toContainText(user.name)
    // 아이디 표시 확인
    await expect(page.locator('.mypage-card')).toContainText(user.username)

    await page.screenshot({ path: 'tests/screenshots/mypage-info.png' })
    await deleteUserByToken(page.request, token)
  })

  test('거주지 및 성별 표시', async ({ page }) => {
    const { user, token } = await loginPage(page, page.request)
    await page.goto('/mypage')

    await expect(page.locator('.mypage-card')).toContainText(user.address)
    await expect(page.locator('.mypage-card')).toContainText('기타')

    await deleteUserByToken(page.request, token)
  })

  test('대화 이력 보기 링크 → /history', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/mypage')

    await page.locator('.mypage-history-link').click()
    await expect(page).toHaveURL(/\/history/, { timeout: 5000 })

    await deleteUserByToken(page.request, token)
  })

  test('로그아웃 버튼 동작', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/mypage')

    await page.locator('.mypage-logout-btn').click()
    // 홈으로 이동
    await expect(page).toHaveURL('/', { timeout: 5000 })
    // 로그인 버튼 표시
    await expect(page.locator('.header-login-btn')).toBeVisible()

    await deleteUserByToken(page.request, token)
  })

  test('회원 탈퇴 버튼 → 확인 모달 표시', async ({ page }) => {
    const { token } = await loginPage(page, page.request)
    await page.goto('/mypage')

    await page.locator('.mypage-delete-btn').click()
    await expect(page.locator('.mypage-confirm-box')).toBeVisible()
    await expect(page.locator('.mypage-confirm-title')).toContainText('탈퇴')

    await page.screenshot({ path: 'tests/screenshots/mypage-confirm.png' })
    // 취소
    await page.locator('.mypage-confirm-cancel').click()
    await expect(page.locator('.mypage-confirm-box')).not.toBeVisible()

    await deleteUserByToken(page.request, token)
  })

  test('회원 탈퇴 확인 → 홈 이동 + 로그아웃', async ({ page }) => {
    // 탈퇴할 전용 유저 생성
    const user = uniqueUser('del_ui')
    const { body } = await registerUser(page.request, user)
    const token = body.data?.token

    await page.goto('/')
    await page.evaluate((t) => localStorage.setItem('token', t), token)
    await page.reload()

    await page.goto('/mypage')
    await page.locator('.mypage-delete-btn').click()
    await expect(page.locator('.mypage-confirm-box')).toBeVisible()
    await page.locator('.mypage-confirm-ok').click()

    // 탈퇴 완료 후 홈으로 이동
    await expect(page).toHaveURL('/', { timeout: 15000 })
    // 로그인 버튼 표시 (로그아웃 상태)
    await expect(page.locator('.header-login-btn')).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'tests/screenshots/mypage-deleted.png' })
    // 이미 탈퇴됐으므로 cleanup 불필요
  })
})
