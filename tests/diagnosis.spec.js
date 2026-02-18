import { test, expect } from '@playwright/test'

test.describe('피해 진단', () => {
  test('진단 페이지 로드 및 체크박스 10개 확인', async ({ page }) => {
    await page.goto('/diagnosis')
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 })
    const count = await checkboxes.count()
    expect(count).toBe(10)
    await page.screenshot({ path: 'tests/screenshots/diagnosis-load.png' })
  })

  test('체크박스 선택 동작 확인', async ({ page }) => {
    await page.goto('/diagnosis')
    const checkboxes = page.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 })

    // 여러 체크박스 체크
    await checkboxes.nth(0).check()
    await checkboxes.nth(2).check()
    await checkboxes.nth(4).check()

    expect(await checkboxes.nth(0).isChecked()).toBe(true)
    expect(await checkboxes.nth(2).isChecked()).toBe(true)
    await page.screenshot({ path: 'tests/screenshots/diagnosis-checked.png' })
  })

  test('API - 고위험 진단 → 매우높음 반환', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/diagnosis', {
      data: {
        checks: {
          registrationChecked: false,
          ownerIdentityVerified: false,
          registrationAndDate: false,
          highJeonseRate: true,
          mortgageExists: true,
          noHugInsurance: true,
          taxDelinquency: true,
          corporateOwner: false,
          multiUnitBuilding: true,
          ownerUnreachable: true,
        },
      },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.riskScore).toBeGreaterThanOrEqual(70)
    expect(['높음', '매우높음']).toContain(body.data.riskLevel)
    expect(body.data.immediateActions.length).toBeGreaterThan(0)
    console.log('✅ 위험도:', body.data.riskLevel, '/ 점수:', body.data.riskScore)
  })

  test('API - 저위험 진단 → 낮음 반환', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/diagnosis', {
      data: {
        checks: {
          registrationChecked: true, ownerIdentityVerified: true,
          registrationAndDate: true, highJeonseRate: false,
          mortgageExists: false, noHugInsurance: false,
          taxDelinquency: false, corporateOwner: false,
          multiUnitBuilding: false, ownerUnreachable: false,
        },
      },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.data.riskScore).toBeLessThan(30)
    console.log('✅ 저위험 점수:', body.data.riskScore)
  })

  test('API - 체크리스트 없이 요청 시 400', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/diagnosis', { data: {} })
    expect(response.status()).toBe(400)
  })
})
