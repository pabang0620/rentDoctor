/**
 * 법제처 법령 크롤러 v2
 * law.go.kr 은 iframe 구조 → iframe URL 직접 접근
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const LAWS = [
  {
    id: 'housing-lease-protection-act',
    name: '주택임대차보호법',
    shortName: '주임법',
    directUrl: 'https://www.law.go.kr/법령/주택임대차보호법',
    keywords: ['대항력', '우선변제권', '최우선변제권', '확정일자', '전입신고', '보증금', '임대차', '임차인', '임대인', '계약갱신', '묵시적갱신', '소액임차인', '경매', '배당', '임차권등기']
  },
  {
    id: 'housing-lease-enforcement-decree',
    name: '주택임대차보호법 시행령',
    shortName: '주임법시행령',
    directUrl: 'https://www.law.go.kr/법령/주택임대차보호법시행령',
    keywords: ['최우선변제', '소액보증금', '기준금액', '서울', '수도권', '광역시', '보증금상한', '금액기준']
  },
  {
    id: 'jeonse-fraud-special-act',
    name: '전세사기피해자 지원 및 주거안정에 관한 특별법',
    shortName: '전세사기특별법',
    directUrl: 'https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법',
    keywords: ['전세사기', '피해자', '특별법', '우선매수권', '경공매', '긴급복지', '저리대출', '피해인정', 'LH', '공공임대', '주거지원', '금융지원']
  },
  {
    id: 'lease-registration-act',
    name: '임차권등기명령 절차에 관한 규칙',
    shortName: '임차권등기규칙',
    directUrl: 'https://www.law.go.kr/법령/임차권등기명령절차에관한규칙',
    keywords: ['임차권등기', '등기명령', '신청서류', '관할법원', '대항력유지', '이사', '주민등록말소']
  }
]

function generateDescription(number, title, content) {
  const descMap = {
    '제3조': '전입신고(주민등록)와 실제 거주(인도)를 마치면 제3자에게 임차권을 주장할 수 있는 대항력이 생깁니다. 전입신고 다음날부터 효력이 발생합니다.',
    '제3조의2': '전입신고 + 확정일자를 모두 갖추면 경매/공매 시 후순위 채권자보다 먼저 보증금을 받을 수 있습니다.',
    '제3조의3': '임차권등기명령으로 이사 후에도 대항력과 우선변제권을 유지할 수 있습니다. 이사 전 반드시 신청하세요.',
    '제4조': '임대차 기간은 최소 2년이 보장되며, 2년 미만으로 계약해도 임차인은 2년을 주장할 수 있습니다.',
    '제6조': '집주인이 계약 만료 6~2개월 전에 갱신거절을 통보하지 않으면 동일 조건으로 자동 갱신됩니다.',
    '제6조의3': '임차인은 1회에 한해 계약갱신을 요구할 수 있으며, 보증금은 5% 이내에서만 증액됩니다.',
    '제7조': '차임 또는 보증금의 증액은 5%를 초과할 수 없습니다.',
    '제8조': '소액임차인은 최우선변제권으로 경매 배당에서 가장 먼저 일부 보증금을 받을 수 있습니다.',
    '제9조': '임차권은 승계됩니다. 임차인이 사망한 경우 동거 가족이 임차권을 승계할 수 있습니다.',
  }

  if (descMap[number]) return descMap[number]

  const titleLower = (title || '').toLowerCase()
  if (titleLower.includes('대항력')) return '임차인의 대항력에 관한 조항입니다.'
  if (titleLower.includes('우선변제')) return '임차인의 우선변제권에 관한 조항입니다.'
  if (titleLower.includes('갱신')) return '임대차 계약 갱신에 관한 조항입니다.'
  if (titleLower.includes('등기')) return '임차권 등기에 관한 조항입니다.'
  if (titleLower.includes('보증금')) return '보증금 보호에 관한 조항입니다.'

  return content.slice(0, 100).trim()
}

async function parseLawViaIframe(browser, law) {
  console.log(`\n[${law.name}] 크롤링...`)

  const page = await browser.newPage()

  try {
    // 메인 페이지 로드해서 iframe URL 획득
    await page.goto(law.directUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    await page.waitForTimeout(3000)

    // iframe URL 추출
    const iframeUrl = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      return iframe ? iframe.src : null
    })

    if (!iframeUrl) {
      console.log('  iframe 없음, 직접 파싱 시도...')
      // iframe 없으면 현재 페이지에서 파싱
      return await parseTextContent(page, law)
    }

    console.log(`  iframe URL: ${iframeUrl.slice(0, 80)}...`)

    // iframe URL 직접 접근
    await page.goto(iframeUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    await page.waitForTimeout(3000)

    return await parseTextContent(page, law)

  } catch (err) {
    console.error(`  오류: ${err.message}`)
    await page.close()
    return { ...law, articles: [], error: err.message }
  } finally {
    await page.close()
  }
}

async function parseTextContent(page, law) {
  const result = await page.evaluate(() => {
    const text = document.body.innerText
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    const articles = []
    let current = null
    let buffer = ''

    for (const line of lines) {
      // 조문 패턴: 제1조, 제1조의2 등
      const match = line.match(/^(제\d+조(?:의\d+)?)(?:\s*[\(（〔]([^)）〕]+)[\)）〕])?\s*(.*)/)

      if (match) {
        if (current && buffer.trim().length > 5) {
          current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 800)
          articles.push(current)
        }
        current = {
          number: match[1],
          title: match[2] ? match[2].trim() : '',
          rawLine: line
        }
        buffer = match[3] ? match[3].trim() : ''
      } else if (current) {
        if (buffer.length < 700) {
          buffer += ' ' + line
        }
      }
    }

    // 마지막 조문 저장
    if (current && buffer.trim().length > 5) {
      current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 800)
      articles.push(current)
    }

    return {
      articles: articles.filter(a => a.content.length > 10),
      rawText: text.slice(0, 3000),
      title: document.title
    }
  })

  const articles = result.articles.slice(0, 50).map(art => ({
    number: art.number,
    title: art.title,
    content: art.content,
    description: generateDescription(art.number, art.title, art.content)
  }))

  console.log(`  추출 조문 수: ${articles.length}개`)

  if (articles.length === 0) {
    console.log('  본문 텍스트 샘플:')
    console.log('  ' + result.rawText.slice(0, 300).replace(/\n/g, '\n  '))
  }

  return {
    ...law,
    crawledAt: new Date().toISOString(),
    articles
  }
}

async function main() {
  console.log('=== 법제처 법령 크롤러 v2 시작 ===\n')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ko-KR']
  })

  const results = []

  for (const law of LAWS) {
    const result = await parseLawViaIframe(browser, law)
    results.push(result)
    await new Promise(r => setTimeout(r, 2000))
  }

  await browser.close()

  mkdirSync(join(__dirname, 'output'), { recursive: true })

  // 최종 JSON (백엔드 포맷)
  const finalData = {
    version: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString(),
    laws: results.map(r => ({
      id: r.id,
      name: r.name,
      shortName: r.shortName,
      keywords: r.keywords,
      crawledAt: r.crawledAt,
      articles: r.articles || []
    }))
  }

  const finalPath = join(__dirname, 'output/laws-final.json')
  writeFileSync(finalPath, JSON.stringify(finalData, null, 2), 'utf-8')

  console.log('\n=== 크롤링 완료 ===')
  console.log(`저장 위치: ${finalPath}`)
  console.log('\n결과 요약:')
  for (const r of results) {
    const status = r.error
      ? `오류 (${r.error.slice(0, 60)})`
      : `${r.articles.length}개 조문`
    console.log(`  [${r.name}]: ${status}`)
  }
}

main().catch(console.error)
