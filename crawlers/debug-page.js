/**
 * law.go.kr 페이지 구조 디버깅
 */
import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  console.log('페이지 로딩...')
  await page.goto('https://www.law.go.kr/법령/주택임대차보호법', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })

  // 추가 로딩 대기
  await page.waitForTimeout(5000)

  // 페이지 구조 확인
  const debug = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      // 주요 셀렉터 존재 여부
      selectors: {
        '#lawContent': !!document.querySelector('#lawContent'),
        '.lawView': !!document.querySelector('.lawView'),
        '#contentWrap': !!document.querySelector('#contentWrap'),
        '.law-article': !!document.querySelector('.law-article'),
        '[class*="law"]': document.querySelectorAll('[class*="law"]').length,
        '[id*="law"]': document.querySelectorAll('[id*="law"]').length,
        'article': document.querySelectorAll('article').length,
        'iframe': document.querySelectorAll('iframe').length,
      },
      // 첫 2000자 텍스트
      bodyText: document.body.innerText.slice(0, 2000),
      // 전체 HTML 구조 (처음 3000자)
      htmlSnippet: document.body.innerHTML.slice(0, 3000),
      // 모든 class명
      allClasses: [...new Set([...document.querySelectorAll('*')].map(el => el.className).filter(c => c && typeof c === 'string'))].slice(0, 50),
      // 모든 id
      allIds: [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean).slice(0, 30),
    }
  })

  console.log('=== 페이지 정보 ===')
  console.log('제목:', debug.title)
  console.log('URL:', debug.url)
  console.log('\n=== 셀렉터 체크 ===')
  console.log(JSON.stringify(debug.selectors, null, 2))
  console.log('\n=== ID 목록 ===')
  console.log(debug.allIds.join(', '))
  console.log('\n=== 클래스 목록 ===')
  console.log(debug.allClasses.join(', '))
  console.log('\n=== 본문 텍스트 (첫 1500자) ===')
  console.log(debug.bodyText.slice(0, 1500))

  // iframe 체크
  if (debug.selectors.iframe > 0) {
    console.log('\n=== iframe 발견! ===')
    const iframes = await page.frames()
    for (const frame of iframes) {
      const frameText = await frame.evaluate(() => document.body?.innerText?.slice(0, 500)).catch(() => '')
      if (frameText && frameText.includes('제')) {
        console.log(`iframe URL: ${frame.url()}`)
        console.log('iframe 내용:', frameText.slice(0, 300))
      }
    }
  }

  await browser.close()
}

main().catch(console.error)
