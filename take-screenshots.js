import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:5173'
const OUT  = './screenshots'
mkdirSync(OUT, { recursive: true })

// Play Store 권장: 1080×1920 (9:16 portrait)
const PHONE = { width: 1080, height: 1920, deviceScaleFactor: 1 }

const pages = [
  { name: '01_home',      url: '/',          wait: 1000 },
  { name: '02_chat',      url: '/chat',      wait: 2500 },
  { name: '03_diagnosis', url: '/diagnosis', wait: 1500 },
  { name: '04_login',     url: '/login',     wait: 1000 },
]

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: PHONE })
  const page    = await context.newPage()

  for (const { name, url, wait } of pages) {
    console.log(`📸 ${name} 캡처 중...`)
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(wait)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
    console.log(`   ✅ ${OUT}/${name}.png`)
  }

  // 채팅 - 빠른 질문 탭 열린 상태
  console.log('📸 05_chat_questions 캡처 중...')
  await page.goto(BASE + '/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.click('.chat-quick-tab')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/05_chat_questions.png`, fullPage: false })
  console.log(`   ✅ ${OUT}/05_chat_questions.png`)

  // 진단 - 체크리스트 일부 선택 상태
  console.log('📸 06_diagnosis_filled 캡처 중...')
  await page.goto(BASE + '/diagnosis', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const checkboxes = await page.locator('input[type="checkbox"]').all()
  for (let i = 0; i < Math.min(4, checkboxes.length); i++) {
    await checkboxes[i].check()
    await page.waitForTimeout(100)
  }
  await page.screenshot({ path: `${OUT}/06_diagnosis_filled.png`, fullPage: false })
  console.log(`   ✅ ${OUT}/06_diagnosis_filled.png`)

  await browser.close()
  console.log('\n🎉 스크린샷 완료! screenshots/ 폴더를 확인하세요.')
})()
