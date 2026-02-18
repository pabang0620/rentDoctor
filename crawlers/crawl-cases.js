/**
 * 판례 크롤러 v3
 * 대상: law.go.kr 판례 검색 (법제처)
 * iframe 구조 활용
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SEARCH_QUERIES = [
  { keyword: '임차권등기명령 대항력', type: '임차권등기', maxResults: 5 },
  { keyword: '보증금반환 전입신고 확정일자', type: '보증금반환', maxResults: 5 },
  { keyword: '소액임차인 최우선변제권', type: '최우선변제', maxResults: 5 },
  { keyword: '전세사기 사기죄 임차인', type: '전세사기', maxResults: 4 },
  { keyword: '묵시적갱신 임대차계약', type: '묵시적갱신', maxResults: 3 },
]

// 법제처 판례 검색
async function searchLawGoPrecedents(browser, query) {
  console.log(`\n[법제처] "${query.keyword}" 판례 검색...`)
  const page = await browser.newPage()

  try {
    // 법제처 판례 검색 URL
    const searchUrl = `https://www.law.go.kr/precSc.do?menuId=7&subMenuId=46&tabMenuId=196&query=${encodeURIComponent(query.keyword)}&section=prec`

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // iframe이 있으면 iframe URL 추출
    const iframeUrl = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      return iframe?.src || null
    })

    if (iframeUrl) {
      console.log(`  iframe으로 이동: ${iframeUrl.slice(0, 80)}...`)
      await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)
    }

    // 판례 목록 추출
    const results = await page.evaluate((maxR) => {
      const items = []
      const bodyText = document.body.innerText
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 5)

      // 판례번호 패턴으로 파싱
      for (let i = 0; i < lines.length && items.length < maxR; i++) {
        const line = lines[i]
        // 판례번호: 대법원 2023다12345 형식
        const caseMatch = line.match(/(대법원|고등법원|지방법원).*?(\d{4}[다나가마파하바사아자차카타라]\d+)/)
        const dateMatch = line.match(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/)

        if (caseMatch) {
          const excerpt = lines.slice(i, Math.min(i + 5, lines.length)).join(' ')
          items.push({
            court: caseMatch[1],
            caseNumber: caseMatch[2],
            date: dateMatch?.[0] || '',
            rawText: excerpt.slice(0, 400)
          })
        }
      }

      // 링크 기반 추출 (백업)
      if (items.length === 0) {
        const links = document.querySelectorAll('a[href*="prec"], a[href*="panre"]')
        links.forEach((link, idx) => {
          if (idx >= maxR) return
          const text = link.textContent.trim()
          if (text.length > 5) {
            const caseNum = text.match(/(\d{4}[다나가마파하바사아자차카타라]\d+)/)?.[1] || ''
            items.push({
              court: '',
              caseNumber: caseNum,
              date: '',
              rawText: text.slice(0, 300),
              url: link.href
            })
          }
        })
      }

      return items
    }, query.maxResults)

    console.log(`  결과: ${results.length}건`)

    // 상세 내용 가져오기
    const detailed = []
    for (const item of results.slice(0, 3)) {
      if (item.url) {
        try {
          await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 })
          await page.waitForTimeout(2000)
          const detail = await page.evaluate(() => {
            return document.body.innerText.slice(0, 2000)
          })
          detailed.push({ ...item, fullText: detail })
        } catch {}
      } else {
        detailed.push(item)
      }
    }

    await page.close()
    return detailed.length > 0 ? detailed : results

  } catch (err) {
    console.error(`  오류: ${err.message.slice(0, 80)}`)
    await page.close()
    return []
  }
}

// 주요 판례 직접 접근 (알려진 판례번호)
async function fetchKnownPrecedents(browser) {
  console.log('\n[직접 접근] 주요 전세사기 판례 수집...')
  const page = await browser.newPage()
  const cases = []

  // 법제처에서 검색으로 알려진 중요 판례들
  const knownSearches = [
    {
      url: 'https://www.law.go.kr/precSc.do?menuId=7&subMenuId=46&tabMenuId=196&query=%EC%9E%84%EC%B0%A8%EA%B6%8C%EB%93%B1%EA%B8%B0%EB%AA%85%EB%A0%B9&section=prec',
      type: '임차권등기'
    },
    {
      url: 'https://www.law.go.kr/precSc.do?menuId=7&subMenuId=46&tabMenuId=196&query=%EC%A0%84%EC%84%B8%EB%B3%B4%EC%A6%9D%EA%B8%88+%EB%8C%80%ED%95%AD%EB%A0%A5&section=prec',
      type: '대항력'
    }
  ]

  for (const target of knownSearches) {
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      const iframeUrl = await page.evaluate(() => document.querySelector('iframe')?.src)
      if (iframeUrl) {
        await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(3000)
      }

      const text = await page.evaluate(() => document.body.innerText.slice(0, 5000))
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

      // 판례 파싱
      let currentCase = null
      for (const line of lines) {
        const caseMatch = line.match(/(대법원|고등법원|지방법원)\s+(\d{4})\.\s*(\d+)\.\s*(\d+).*?(\d{4}[다나가마파하바사아자차카타라]\d+)/)
        if (caseMatch) {
          if (currentCase) cases.push(currentCase)
          currentCase = {
            court: caseMatch[1],
            date: `${caseMatch[2]}.${caseMatch[3]}.${caseMatch[4]}`,
            caseNumber: caseMatch[5],
            type: target.type,
            rawText: line,
            summary: ''
          }
        } else if (currentCase && line.length > 10 && currentCase.summary.length < 300) {
          currentCase.summary += ' ' + line
        }
      }
      if (currentCase) cases.push(currentCase)

      console.log(`  ${target.type}: ${cases.length}건 누적`)
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error(`  오류: ${err.message.slice(0, 60)}`)
    }
  }

  await page.close()
  return cases
}

function buildCaseJson(rawItem, query, index) {
  const allText = rawItem.fullText || rawItem.rawText || rawItem.summary || ''

  const lessons = []
  if (allText.includes('대항력') || allText.includes('전입신고')) {
    lessons.push('전입신고와 실제 점유(인도)가 모두 있어야 대항력이 발생합니다')
  }
  if (allText.includes('확정일자') || allText.includes('우선변제')) {
    lessons.push('확정일자는 경매 시 우선변제권의 핵심 요건입니다')
  }
  if (allText.includes('임차권등기')) {
    lessons.push('임차권등기명령은 이사 전에 반드시 완료해야 합니다')
  }
  if (allText.includes('최우선변제') || allText.includes('소액임차인')) {
    lessons.push('소액임차인은 경매 낙찰가의 일정 비율을 우선 배당받을 수 있습니다')
  }
  if (allText.includes('사기') || allText.includes('형사')) {
    lessons.push('전세사기는 형사고소(사기죄)와 민사소송을 병행할 수 있습니다')
  }
  if (lessons.length === 0) {
    lessons.push('관련 법령을 꼼꼼히 확인하고 법률 전문가와 상담하세요')
  }

  return {
    id: `case-${query.type}-${String(index + 1).padStart(3, '0')}`,
    title: [rawItem.court, rawItem.caseNumber, rawItem.date]
      .filter(Boolean).join(' ') || rawItem.rawText?.slice(0, 60) || `${query.type} 판례 ${index + 1}`,
    type: query.type,
    caseNumber: rawItem.caseNumber || '',
    court: rawItem.court || '',
    date: rawItem.date || '',
    source: 'law.go.kr',
    summary: allText.slice(0, 300).replace(/\s+/g, ' ').trim(),
    outcome: '',
    situation: {},
    lessons,
    crawledAt: new Date().toISOString()
  }
}

async function main() {
  console.log('=== 판례 크롤러 v3 시작 ===')
  console.log('대상: law.go.kr (법제처 판례 검색)\n')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR']
  })

  const allCases = []
  let globalIdx = 0

  // 1. 키워드별 검색
  for (const query of SEARCH_QUERIES) {
    const results = await searchLawGoPrecedents(browser, query)
    const parsed = results.map((item, idx) => buildCaseJson(item, query, globalIdx + idx))
    allCases.push(...parsed)
    globalIdx += parsed.length
    await new Promise(r => setTimeout(r, 2000))
  }

  // 2. 직접 접근 판례
  const knownCases = await fetchKnownPrecedents(browser)
  for (const c of knownCases) {
    const parsed = buildCaseJson(c, { type: c.type }, globalIdx++)
    allCases.push(parsed)
  }

  await browser.close()

  mkdirSync(join(__dirname, 'output'), { recursive: true })

  const output = {
    version: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString(),
    source: 'law.go.kr',
    totalCount: allCases.length,
    cases: allCases
  }

  const outPath = join(__dirname, 'output/cases-final.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')

  console.log('\n=== 크롤링 완료 ===')
  console.log(`총 판례: ${allCases.length}건`)

  const byType = {}
  for (const c of allCases) byType[c.type] = (byType[c.type] || 0) + 1
  for (const [t, n] of Object.entries(byType)) console.log(`  ${t}: ${n}건`)

  console.log(`저장: ${outPath}`)
}

main().catch(console.error)
