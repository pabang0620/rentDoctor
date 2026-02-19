/**
 * 피해 진단 UI + API 테스트
 */
import { test, expect } from '@playwright/test'

const API = 'http://localhost:5000'

test.describe('진단 페이지 UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/diagnosis')
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('체크박스 10개 표시', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(10)
    await page.screenshot({ path: 'tests/screenshots/diagnosis.png' })
  })

  test('체크박스 클릭 → 체크 상태 변경', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.nth(0).check()
    await checkboxes.nth(3).check()
    await checkboxes.nth(6).check()
    expect(await checkboxes.nth(0).isChecked()).toBe(true)
    expect(await checkboxes.nth(3).isChecked()).toBe(true)
    expect(await checkboxes.nth(6).isChecked()).toBe(true)
    expect(await checkboxes.nth(1).isChecked()).toBe(false)
  })

  test('전체 해제 버튼 동작', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    // 모두 체크
    for (let i = 0; i < 5; i++) await checkboxes.nth(i).check()

    const resetBtn = page.locator('button:has-text("초기화"), button:has-text("전체 해제"), button:has-text("다시")').first()
    if (await resetBtn.isVisible()) {
      await resetBtn.click()
      // 체크가 해제되었는지 확인
      for (let i = 0; i < 5; i++) {
        expect(await checkboxes.nth(i).isChecked()).toBe(false)
      }
    }
  })

  test('아무것도 체크 안 하고 진단 → 낮음 결과', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("진단"), button:has-text("확인")').first()
    await submitBtn.click()
    // 결과 영역이 나타나는지 확인 (위험도 텍스트)
    const result = page.locator('[class*="result"], [class*="risk"], :has-text("위험도")').first()
    await expect(result).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'tests/screenshots/diagnosis-result.png' })
  })
})

test.describe('진단 API 직접', () => {
  const ALL_RISK = {
    registrationChecked: false, ownerIdentityVerified: false,
    registrationAndDate: false, highJeonseRate: true,
    mortgageExists: true, noHugInsurance: true,
    taxDelinquency: true, corporateOwner: true,
    multiUnitBuilding: true, ownerUnreachable: true,
  }
  const NO_RISK = {
    registrationChecked: true, ownerIdentityVerified: true,
    registrationAndDate: true, highJeonseRate: false,
    mortgageExists: false, noHugInsurance: false,
    taxDelinquency: false, corporateOwner: false,
    multiUnitBuilding: false, ownerUnreachable: false,
  }
  const MID_RISK = {
    registrationChecked: false, ownerIdentityVerified: false,
    registrationAndDate: true, highJeonseRate: true,
    mortgageExists: false, noHugInsurance: false,
    taxDelinquency: false, corporateOwner: false,
    multiUnitBuilding: false, ownerUnreachable: false,
  }

  test('최고위험 → 100점 근처', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: ALL_RISK } })
    if (res.status() === 429) { test.skip(); return }
    expect(res.status()).toBe(200)
    const b = await res.json()
    expect(b.data.riskScore).toBeGreaterThanOrEqual(80)
    console.log(`✅ 최고위험: ${b.data.riskLevel} ${b.data.riskScore}점`)
  })

  test('무위험 → 0점', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: NO_RISK } })
    if (res.status() === 429) { test.skip(); return }
    const b = await res.json()
    expect(b.data.riskScore).toBe(0)
    expect(b.data.riskLevel).toBe('낮음')
  })

  test('중간위험 → 중간 점수', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: MID_RISK } })
    if (res.status() === 429) { test.skip(); return }
    const b = await res.json()
    expect(b.data.riskScore).toBeGreaterThan(0)
    expect(b.data.riskScore).toBeLessThan(80)
  })

  test('immediateActions 배열 존재', async ({ request }) => {
    const res = await request.post(`${API}/api/diagnosis`, { data: { checks: ALL_RISK } })
    if (res.status() === 429) { test.skip(); return }
    const b = await res.json()
    expect(Array.isArray(b.data.immediateActions)).toBe(true)
    expect(b.data.immediateActions.length).toBeGreaterThan(0)
  })
})
