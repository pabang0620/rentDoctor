/**
 * 법제처 국가법령정보센터 크롤러
 * 대상: law.go.kr
 * 크롤 법령: 주택임대차보호법, 전세사기피해자특별법, 주택임대차보호법 시행령
 */

import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 크롤할 법령 목록
const LAW_TARGETS = [
  {
    id: 'housing-lease-protection-act',
    name: '주택임대차보호법',
    shortName: '주임법',
    url: 'https://www.law.go.kr/법령/주택임대차보호법',
    keywords: ['대항력', '우선변제권', '최우선변제권', '확정일자', '전입신고', '보증금', '임대차', '임차인', '임대인', '계약갱신', '묵시적갱신', '소액임차인', '경매', '배당']
  },
  {
    id: 'housing-lease-protection-act-enforcement-decree',
    name: '주택임대차보호법 시행령',
    shortName: '주임법시행령',
    url: 'https://www.law.go.kr/법령/주택임대차보호법시행령',
    keywords: ['최우선변제', '소액보증금', '기준금액', '서울', '수도권', '광역시', '보증금상한']
  },
  {
    id: 'jeonse-fraud-special-act',
    name: '전세사기피해자 지원 및 주거안정에 관한 특별법',
    shortName: '전세사기특별법',
    url: 'https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법',
    keywords: ['전세사기', '피해자', '특별법', '우선매수권', '경공매', '긴급복지', '저리대출', '피해인정', 'LH', '공공임대']
  },
  {
    id: 'lease-registration-order',
    name: '임차권등기명령 절차에 관한 규칙',
    shortName: '임차권등기규칙',
    url: 'https://www.law.go.kr/법령/임차권등기명령절차에관한규칙',
    keywords: ['임차권등기', '등기명령', '신청서류', '관할법원', '대항력유지', '이사']
  }
]

async function crawlLawPage(browser, target) {
  console.log(`\n크롤링 시작: ${target.name}`)
  const page = await browser.newPage()

  try {
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // 법령 제목 확인
    const title = await page.title()
    console.log(`  페이지 타이틀: ${title}`)

    // 조문 목록 추출
    const articles = await page.evaluate(() => {
      const results = []

      // law.go.kr 조문 구조 파싱
      // 조문번호: .law-articleNo 또는 #contentBody 내부
      const articleElements = document.querySelectorAll('.law-bd .law-article, .lawView .law-article, [class*="article"]')

      if (articleElements.length > 0) {
        articleElements.forEach((el) => {
          const noEl = el.querySelector('.law-articleNo, .artclNum') || el
          const titleEl = el.querySelector('.law-articleTitle, .artclTitle')
          const bodyEl = el.querySelector('.law-articleBody, .artclCont, .law-sentence')

          const number = noEl?.textContent?.trim()?.match(/(제\d+조(?:의\d+)?)/)?.[1] || ''
          const articleTitle = titleEl?.textContent?.trim()?.replace(/[()]/g, '') || ''
          const content = bodyEl?.textContent?.trim()?.slice(0, 500) || el.textContent?.trim()?.slice(0, 300) || ''

          if (number && content.length > 10) {
            results.push({ number, title: articleTitle, content })
          }
        })
      }

      // 대체 방법: 텍스트 기반 파싱
      if (results.length === 0) {
        const allText = document.querySelector('#lawContent, .law-body, #contentBody, .viewer')
        if (allText) {
          const text = allText.innerText
          const lines = text.split('\n').map(l => l.trim()).filter(l => l)

          let currentArticle = null
          for (const line of lines) {
            const articleMatch = line.match(/^(제\d+조(?:의\d+)?)(?:\s*\(([^)]+)\))?(.*)/)
            if (articleMatch) {
              if (currentArticle) results.push(currentArticle)
              currentArticle = {
                number: articleMatch[1],
                title: articleMatch[2] || '',
                content: articleMatch[3]?.trim() || ''
              }
            } else if (currentArticle && line.length > 0) {
              currentArticle.content += ' ' + line
              if (currentArticle.content.length > 600) {
                currentArticle.content = currentArticle.content.slice(0, 600) + '...'
              }
            }
          }
          if (currentArticle) results.push(currentArticle)
        }
      }

      return results.slice(0, 30) // 최대 30개 조문
    })

    console.log(`  추출된 조문 수: ${articles.length}`)

    // 조문이 없으면 전체 텍스트 시도
    if (articles.length === 0) {
      console.log('  조문 파싱 실패, 전체 텍스트 추출 시도...')
      const rawText = await page.evaluate(() => {
        return document.body.innerText.slice(0, 5000)
      })
      console.log('  원문 일부:\n', rawText.slice(0, 500))
    }

    await page.close()

    return {
      ...target,
      crawledAt: new Date().toISOString(),
      articles: articles.map(art => ({
        ...art,
        description: '' // 나중에 AI로 설명 추가 가능
      }))
    }
  } catch (error) {
    console.error(`  오류: ${error.message}`)
    await page.close()
    return { ...target, articles: [], error: error.message }
  }
}

async function main() {
  console.log('=== 법제처 법령 크롤러 시작 ===')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const results = []

  for (const target of LAW_TARGETS) {
    const result = await crawlLawPage(browser, target)
    results.push(result)
    // 서버 부하 방지
    await new Promise(r => setTimeout(r, 3000))
  }

  await browser.close()

  // 결과 저장
  const outputPath = join(__dirname, 'output/laws-raw.json')
  const outputDir = join(__dirname, 'output')

  import('fs').then(({ mkdirSync }) => {
    mkdirSync(outputDir, { recursive: true })
  })

  const { mkdirSync } = await import('fs')
  mkdirSync(outputDir, { recursive: true })

  writeFileSync(outputPath, JSON.stringify({ laws: results }, null, 2), 'utf-8')

  console.log('\n=== 크롤링 완료 ===')
  console.log(`저장 위치: ${outputPath}`)
  console.log('\n요약:')
  for (const r of results) {
    console.log(`  - ${r.name}: ${r.articles?.length || 0}개 조문 ${r.error ? '(오류: ' + r.error + ')' : ''}`)
  }
}

main().catch(console.error)
