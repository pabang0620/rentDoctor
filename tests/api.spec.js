import { test, expect } from '@playwright/test'

test.describe('백엔드 API', () => {
  test('헬스체크', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.geminiConfigured).toBe(true)
    console.log('✅ 서버 정상, Gemini:', body.geminiConfigured)
  })

  test('법령 목록 9개 조회', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/legal/laws')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.data.laws.length).toBe(9)
    console.log('✅ 법령:', body.data.laws.map(l => l.name).join(', '))
  })

  test('법령 키워드 검색 - 대항력', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/legal/search?q=대항력')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.laws.length).toBeGreaterThan(0)
    console.log('✅ "대항력" 검색 결과:', body.data.laws.length, '개 법령')
  })

  test('법령 검색 - 쿼리 없으면 400', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/legal/search')
    expect(response.status()).toBe(400)
  })

  test('체크리스트 항목 10개', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/diagnosis/checklist')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.data.items.length).toBe(10)
  })

  test('없는 세션 ID → 404', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/chat/session/00000000-0000-0000-0000-000000000000')
    expect(response.status()).toBe(404)
  })

  test('2001자 메시지 → 400', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/chat', {
      data: { message: 'a'.repeat(2001) },
    })
    expect(response.status()).toBe(400)
  })
})
