/**
 * 데이터 품질 수정:
 * 1. 전세사기특별법 나머지 조문 (제17~34조) 크롤
 * 2. 판례 중복 제거 + 내용 부족 항목 보강
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendData = join(__dirname, '../backend/src/data')

// ============================================================
// 1. 전세사기특별법 나머지 조문 크롤
// ============================================================
async function crawlSpecialActFull(browser) {
  console.log('\n[1] 전세사기특별법 전체 조문 재크롤...')
  const page = await browser.newPage()

  await page.goto('https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법', {
    waitUntil: 'domcontentloaded', timeout: 30000
  })
  await page.waitForTimeout(3000)

  const iframeUrl = await page.evaluate(() => document.querySelector('iframe')?.src)
  await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(4000)

  const rawText = await page.evaluate(() => document.body.innerText)
  await page.close()

  // 파싱: 실제 법령 본문 부분만 추출
  // "전세사기피해자 지원 및 주거안정에 관한 특별법 ( 약칭:" 이후부터 파싱
  const startIdx = rawText.indexOf('제1장 총칙')
  const text = startIdx >= 0 ? rawText.slice(startIdx) : rawText

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  const articles = []
  let current = null
  let buffer = ''

  for (const line of lines) {
    // 장/절 구분선 스킵
    if (/^제\d+장|^제\d+절/.test(line) && line.length < 30) continue

    // 조문 패턴
    const match = line.match(/^ ?(제\d+조(?:의\d+)?)(?:\s*[\(（]([^)）]+)[\)）])?\s*(.*)/)

    if (match) {
      if (current && buffer.trim().length > 10) {
        current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 1000)
        articles.push(current)
      }
      current = {
        number: match[1],
        title: match[2] ? match[2].trim() : '',
      }
      buffer = match[3] ? match[3].trim() : ''
    } else if (current) {
      if (buffer.length < 900) buffer += ' ' + line
    }
  }
  if (current && buffer.trim().length > 10) {
    current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 1000)
    articles.push(current)
  }

  // 중복 제거 (같은 조문번호)
  const seen = new Set()
  const unique = articles.filter(a => {
    if (seen.has(a.number)) return false
    seen.add(a.number)
    return true
  })

  console.log(`  추출 조문: ${unique.length}개`)
  for (const a of unique) {
    console.log(`  ${a.number} ${a.title} | ${a.content.slice(0, 60)}`)
  }

  return unique
}

function descSpecialAct(number, title, content) {
  const map = {
    '제1조': '전세사기피해자를 지원하고 주거안정을 도모하기 위한 법의 목적을 규정합니다.',
    '제2조': '전세사기피해자, 임대인등, 주택 등 주요 용어를 정의합니다.',
    '제3조': '전세사기피해자로 인정받기 위한 4가지 요건(사기, 경공매, 보증금 미반환, 피해자 확인)을 규정합니다.',
    '제4조': '국가/지자체의 임차인보호대책 수립 의무를 규정합니다.',
    '제5조': '이 법은 다른 법률에 우선 적용됩니다.',
    '제6조': '전세사기피해지원위원회의 구성 및 기능을 규정합니다.',
    '제12조': '피해자 인정을 받으려면 국토교통부장관에게 신청해야 합니다.',
    '제14조': '전세사기피해자등 결정 기준과 절차를 규정합니다.',
    '제15조': '피해자 인정 결정에 대한 이의신청 절차를 규정합니다.',
    '제17조': '경매 절차를 일시 유예·정지하여 피해자의 권리를 보호합니다.',
    '제18조': '국세 체납으로 인한 공매 시 피해자에게 특례를 부여합니다.',
    '제19조': '지방세 체납으로 인한 공매 시 피해자에게 특례를 부여합니다.',
    '제20조': '경매 절차에서 피해자에게 우선매수권을 부여합니다.',
    '제25조': '공공주택사업자(LH 등)가 경매/공매로 주택을 취득 후 피해자에게 공공임대로 제공합니다.',
    '제27조': '피해자에게 저리 대출 등 금융지원을 합니다.',
    '제28조': '생계가 어려운 피해자에게 긴급복지지원을 합니다.',
  }
  if (map[number]) return map[number]
  const t = (title || '').toLowerCase()
  if (t.includes('우선매수')) return '피해자는 경매/공매 시 최고가로 본인 집을 우선 매수할 수 있습니다.'
  if (t.includes('경매') || t.includes('공매')) return '경매/공매 절차에서의 피해자 보호 조항입니다.'
  if (t.includes('금융')) return '피해자에 대한 금융 지원에 관한 조항입니다.'
  if (t.includes('주거') || t.includes('임대')) return '피해자에 대한 주거 지원에 관한 조항입니다.'
  if (t.includes('긴급')) return '생계 위기 피해자에 대한 긴급복지지원 조항입니다.'
  return content.slice(0, 80).trim()
}

// ============================================================
// 2. 판례 중복 제거 + 내용 보강
// ============================================================
function fixCases(cases) {
  console.log('\n[2] 판례 데이터 정제...')

  // 중복 제거 (판례번호 기준, 없으면 id 기준)
  const seen = new Map()
  const deduped = []

  for (const c of cases) {
    const key = c.caseNumber || c.id
    if (!seen.has(key)) {
      seen.set(key, true)
      deduped.push(c)
    } else {
      console.log(`  중복 제거: ${c.caseNumber} (${c.type})`)
    }
  }

  // 내용 정제
  const fixed = deduped.map(c => {
    let summary = (c.summary || '').trim()

    // 서식 노이즈 제거
    summary = summary
      .replace(/화면내검색.*?한눈보기/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // 번호 prefix 제거 (예: "1 임대차보증금반환..." → "임대차보증금반환...")
    summary = summary.replace(/^\d+\s+/, '')

    // 너무 짧은 요약 보강
    if (summary.length < 50 && c.caseNumber) {
      const typeGuide = {
        '임차권등기': '임차권등기명령과 관련된 대항력·우선변제권에 관한 판례입니다.',
        '대항력': '임차인의 대항력 요건(전입신고+인도)에 관한 판례입니다.',
        '최우선변제': '소액임차인의 최우선변제권에 관한 판례입니다.',
        '보증금반환': '임대차 보증금 반환청구에 관한 판례입니다.',
        '전세사기': '전세사기 관련 민·형사 판례입니다.',
        '묵시적갱신': '임대차 묵시적 갱신에 관한 판례입니다.',
        '깡통전세': '전세가율 과다로 인한 피해 관련 판례입니다.',
      }
      summary = typeGuide[c.type] || summary
    }

    return { ...c, summary: summary.slice(0, 400) }
  })

  const before = cases.length
  const after = fixed.length
  console.log(`  중복 제거: ${before} → ${after}건`)
  return fixed
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  // 1. 전세사기특별법 전체 조문 크롤
  const specialActArticles = await crawlSpecialActFull(browser)
  await browser.close()

  // 2. 법령 JSON 업데이트
  const lawsPath = join(backendData, 'laws/jeonse-fraud-laws.json')
  const laws = JSON.parse(readFileSync(lawsPath, 'utf-8'))

  const specialActIdx = laws.laws.findIndex(l => l.id === 'jeonse-fraud-special-act')
  if (specialActIdx >= 0 && specialActArticles.length > 0) {
    laws.laws[specialActIdx].articles = specialActArticles.map(a => ({
      number: a.number,
      title: a.title,
      content: a.content,
      description: descSpecialAct(a.number, a.title, a.content)
    }))
    laws.laws[specialActIdx].crawledAt = new Date().toISOString()
    console.log(`\n  전세사기특별법 업데이트: ${specialActArticles.length}개 조문`)
  }

  laws.lastUpdated = new Date().toISOString()
  writeFileSync(lawsPath, JSON.stringify(laws, null, 2), 'utf-8')

  // 3. 판례 JSON 정제
  const casesPath = join(backendData, 'cases/sample-cases.json')
  const casesData = JSON.parse(readFileSync(casesPath, 'utf-8'))
  const fixedCases = fixCases(casesData.cases)

  casesData.cases = fixedCases
  casesData.totalCount = fixedCases.length
  casesData.lastUpdated = new Date().toISOString()
  writeFileSync(casesPath, JSON.stringify(casesData, null, 2), 'utf-8')

  // 최종 요약
  console.log('\n==================== 최종 요약 ====================')
  const updatedLaws = JSON.parse(readFileSync(lawsPath, 'utf-8'))
  for (const l of updatedLaws.laws) {
    const count = l.articles?.length || 0
    const hasContent = l.articles?.filter(a => a.content?.length > 20).length || 0
    console.log(`  [${count === hasContent ? 'O' : count > 0 ? '△' : 'X'}] ${l.name}: ${count}개 조문 (정상: ${hasContent}개)`)
  }
  console.log(`  판례: ${fixedCases.length}건`)
}

main().catch(console.error)
