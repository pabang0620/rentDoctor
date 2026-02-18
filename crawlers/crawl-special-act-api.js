/**
 * 법제처 조문 ID API로 전세사기특별법 조문 내용 직접 수집
 * onclick: fncLsLawPop('1031261973','JO','') → ID 추출 → API 호출
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lawsPath = join(__dirname, '../backend/src/data/laws/jeonse-fraud-laws.json')

function getDesc(number) {
  const map = {
    '제3조': '전세사기피해자 인정 4대 요건: ①임대인의 기망·편취(사기), ②경공매 진행 중 또는 우려, ③보증금 미반환, ④임차인이 선의·무과실.',
    '제4조': '국가·지방자치단체의 임차인보호대책 수립 의무.',
    '제5조': '이 법은 다른 법률에 우선하여 적용됩니다.',
    '제14조': '피해자 결정: 위원회 심의 후 국토교통부장관이 결정. 30일 이내 처리.',
    '제17조': '경매·공매 절차 최대 1년 유예·정지 가능. 피해자 거주권 보호.',
    '제20조': '경매에서 피해자는 최고가 낙찰가로 본인 집을 우선매수 가능.',
    '제25조': 'LH 등 공공주택사업자가 경공매로 취득 후 피해자에게 공공임대로 제공.',
    '제27조': '저리 융자, 이자 감면, 보증 등 금융지원. HUG·주택금융공사 통한 지원.',
    '제28조': '생계위기 피해자에게 긴급복지지원법에 따른 생계비·의료비 지원.',
  }
  return map[number] || ''
}

async function main() {
  console.log('전세사기특별법 조문 ID 기반 크롤링...')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  await page.goto('https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법', {
    waitUntil: 'domcontentloaded', timeout: 30000
  })
  await page.waitForTimeout(2000)

  const iframeUrl = await page.evaluate(() => document.querySelector('iframe')?.src)
  await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  // onclick에서 조문 ID 추출
  const articleIds = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[onclick]')]
    const result = []
    for (const a of links) {
      const onclick = a.getAttribute('onclick') || ''
      const idMatch = onclick.match(/fncLsLawPop\('(\d+)','JO'/)
      const text = a.textContent.trim()
      const numMatch = text.match(/(제\d+조(?:의\d+)?)/)
      if (idMatch && numMatch) {
        result.push({
          id: idMatch[1],
          number: numMatch[1],
          rawText: text.slice(0, 60)
        })
      }
    }
    // 중복 제거 (같은 number에서 첫 번째)
    const seen = new Map()
    for (const r of result) {
      if (!seen.has(r.number)) seen.set(r.number, r)
    }
    return [...seen.values()]
  })

  console.log(`수집된 조문 ID: ${articleIds.length}개`)

  // 각 조문 ID로 API 또는 팝업 접근
  const articles = []

  for (const item of articleIds) {
    try {
      // 방법 1: 법제처 조문 API 시도
      const apiUrl = `https://www.law.go.kr/DRF/lawService.do?target=jo&ID=${item.id}&type=JSON`
      const response = await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      if (response && response.status() === 200) {
        const text = await page.evaluate(() => document.body.innerText)
        try {
          const json = JSON.parse(text)
          const content = json?.법령?.조문?.조문내용 || json?.content || json?.text || ''
          if (content.length > 20) {
            console.log(`  [API] ${item.number}: ${content.slice(0, 60)}`)
            articles.push({ number: item.number, content })
            continue
          }
        } catch {
          // JSON 파싱 실패 → 텍스트 그대로
          if (text.length > 30 && !text.includes('오류')) {
            console.log(`  [TEXT] ${item.number}: ${text.slice(0, 60)}`)
            articles.push({ number: item.number, content: text.slice(0, 600) })
            continue
          }
        }
      }
    } catch {}

    try {
      // 방법 2: 팝업 페이지 직접 접근
      const popupUrl = `https://www.law.go.kr/lsInfoP.do?lsiSeq=277021&joSeq=${item.id}`
      await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(1000)
      const text = await page.evaluate(() => document.body.innerText.trim())
      if (text.length > 50) {
        console.log(`  [POPUP] ${item.number}: ${text.slice(0, 60)}`)
        articles.push({ number: item.number, content: text.slice(0, 600) })
      }
    } catch {}

    await new Promise(r => setTimeout(r, 500))
  }

  await browser.close()

  console.log(`\n수집 성공: ${articles.length}/${articleIds.length}개`)

  // 법령 JSON 업데이트
  const laws = JSON.parse(readFileSync(lawsPath, 'utf-8'))
  const idx = laws.laws.findIndex(l => l.id === 'jeonse-fraud-special-act')
  const existing = new Map(laws.laws[idx].articles.map(a => [a.number, a]))

  // 내용이 있는 것으로 업데이트
  for (const a of articles) {
    const content = a.content.trim()
    if (content.length > 30 && !content.startsWith('(')) {
      const ex = existing.get(a.number)
      if (!ex || content.length > (ex.content || '').length) {
        existing.set(a.number, {
          number: a.number,
          title: ex?.title || '',
          content: content.slice(0, 1000),
          description: getDesc(a.number) || ex?.description || content.slice(0, 80)
        })
      }
    }
  }

  const sorted = [...existing.values()].sort((a, b) => {
    const n = s => {
      const m = s.number.match(/제(\d+)조(?:의(\d+))?/)
      return m ? parseInt(m[1]) * 100 + (parseInt(m[2]) || 0) : 0
    }
    return n(a) - n(b)
  })

  laws.laws[idx].articles = sorted
  laws.laws[idx].crawledAt = new Date().toISOString()
  laws.lastUpdated = new Date().toISOString()
  writeFileSync(lawsPath, JSON.stringify(laws, null, 2), 'utf-8')

  // 최종 현황
  const withContent = sorted.filter(a => (a.content || '').length > 50 && !a.content.startsWith('(') && !a.description === a.content)
  console.log(`\n최종 조문 수: ${sorted.length}개`)
  console.log(`본문 있음: ${sorted.filter(a => a.content.length > 50).length}개`)
}

main().catch(console.error)
