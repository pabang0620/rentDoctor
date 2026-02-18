/**
 * 전세사기특별법 조문 클릭 방식 크롤러
 * 조문 목록 버튼을 하나씩 클릭하여 내용 수집
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lawsPath = join(__dirname, '../backend/src/data/laws/jeonse-fraud-laws.json')

function getDesc(number, title) {
  const map = {
    '제3조': '전세사기피해자 인정 4대 요건: ①임대인의 기망·편취(사기), ②경공매 진행 중 또는 우려, ③보증금 미반환, ④임차인이 선의·무과실로 체결.',
    '제14조': '전세사기피해자등 결정 절차 - 위원회 심의 후 국토교통부장관이 결정. 30일 이내 처리.',
    '제14조의2': '피해자 결정 후 요건 변동 시 재심의 규정.',
    '제15조의2': '피해자 결정의 유효기간 및 연장 규정.',
    '제16조': '전세사기 관련 정보체계 구축 및 기관 간 정보 연계.',
    '제17조': '피해자 신청 시 경매·공매 절차를 최대 1년 유예·정지. 거주권 보호.',
    '제18조': '국세 체납 공매에서 피해자에게 공매 배분 특례 제공.',
    '제19조': '지방세 체납 공매에서 피해자에게 공매 배분 특례 제공.',
    '제20조': '경매에서 피해자는 최고가 낙찰가로 본인 집을 우선매수 가능. LH에 매수 의뢰도 가능.',
    '제21조': '국세징수법에 따른 공매에서도 동일한 우선매수권 부여.',
    '제22조': '지방세징수법에 따른 공매에서도 동일한 우선매수권 부여.',
    '제23조': '피해자 보증금 채권은 국세보다 우선 변제.',
    '제24조': '피해자 보증금 채권은 지방세보다 우선 변제.',
    '제25조': 'LH(한국토지주택공사) 등이 경공매로 취득 후 피해자에게 공공임대로 저렴하게 제공.',
    '제25조의2': '공공임대 입주자격 완화 - 피해자는 소득·자산 요건 특례 적용.',
    '제25조의3': '공공주택사업자의 피해자 임시거소 제공.',
    '제25조의4': '공공주택사업자의 피해자 주택 매입·임대.',
    '제25조의5': '피해자 지원을 위한 공공주택사업자 자금지원.',
    '제25조의6': '임시거소 제공 관련 건축법 특례.',
    '제25조의7': '주택임대차보호법 적용 특례.',
    '제25조의8': '전세사기피해주택 관련 임시거소 제공 사업.',
    '제26조': '피해자 경공매 시 감정평가 비용 국가 지원.',
    '제27조': '저리 융자, 이자 감면, 보증 등 금융지원. HUG·주택금융공사 통한 지원.',
    '제28조': '생계위기 피해자에게 긴급복지지원법에 따른 생계비·의료비 지원.',
    '제28조의2': '전세사기피해주택 관련 특례 사항.',
    '제28조의3': '공무원 피해자에 대한 공가 사용 등 특례.',
  }
  return map[number] || ''
}

async function main() {
  console.log('전세사기특별법 클릭 방식 크롤링...')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  // iframe 페이지 직접 접근
  await page.goto('https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법', {
    waitUntil: 'domcontentloaded', timeout: 30000
  })
  await page.waitForTimeout(2000)

  const iframeUrl = await page.evaluate(() => document.querySelector('iframe')?.src)
  await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  // 조문 선택 링크 목록 수집
  const articleLinks = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')]
    return links
      .filter(a => /제\d+조/.test(a.textContent))
      .map(a => ({
        text: a.textContent.trim(),
        href: a.href,
        // onclick 이벤트에서 조문 번호 추출
        onclick: a.getAttribute('onclick') || ''
      }))
      .slice(0, 60)
  })

  console.log(`발견된 조문 링크: ${articleLinks.length}개`)
  // 링크 샘플 출력
  for (const l of articleLinks.slice(0, 10)) {
    console.log(`  ${l.text} | ${l.href.slice(0, 60)} | ${l.onclick.slice(0, 50)}`)
  }

  // 각 링크 클릭 → 내용 수집
  const articles = []

  for (const link of articleLinks) {
    if (!link.href || link.href === '#') continue

    try {
      // href가 앵커(#A0001 등)인 경우 현재 페이지 내에서 스크롤
      if (link.href.includes('#')) {
        const anchor = link.href.split('#')[1]
        // 특정 앵커로 이동
        const content = await page.evaluate((anch) => {
          const el = document.getElementById(anch) || document.querySelector(`[id="${anch}"]`)
          if (el) {
            el.scrollIntoView()
            // 앵커 이후 텍스트 수집
            const text = el.textContent || el.innerText || ''
            return text.slice(0, 600)
          }
          return ''
        }, anchor)

        if (content.length > 30) {
          const numMatch = link.text.match(/(제\d+조(?:의\d+)?)/)
          const titleMatch = link.text.match(/\(([^)]+)\)/)
          if (numMatch) {
            articles.push({
              number: numMatch[1],
              title: titleMatch?.[1] || '',
              content: content.trim()
            })
          }
        }
      }
    } catch (e) {
      // 무시
    }

    await new Promise(r => setTimeout(r, 200))
  }

  await browser.close()

  console.log(`\n클릭으로 수집된 조문: ${articles.length}개`)

  // 기존 데이터와 병합
  const laws = JSON.parse(readFileSync(lawsPath, 'utf-8'))
  const idx = laws.laws.findIndex(l => l.id === 'jeonse-fraud-special-act')
  const existing = laws.laws[idx].articles || []

  // 기존 + 신규 병합 (기존이 더 길면 유지)
  const byNum = new Map()
  for (const a of existing) byNum.set(a.number, a)
  for (const a of articles) {
    const ex = byNum.get(a.number)
    if (!ex || (a.content.length > (ex.content || '').length && !a.content.startsWith('('))) {
      byNum.set(a.number, {
        ...a,
        description: getDesc(a.number, a.title) || a.description || ''
      })
    }
  }

  // 누락된 핵심 조문에 description 직접 추가 (내용은 없어도 description으로 AI에 정보 제공)
  const criticalArticles = [
    '제3조', '제4조', '제5조', '제6조', '제10조', '제14조', '제14조의2',
    '제15조', '제15조의2', '제16조', '제17조', '제18조', '제19조', '제20조',
    '제21조', '제22조', '제23조', '제24조', '제25조', '제25조의2', '제25조의3',
    '제25조의4', '제25조의5', '제25조의6', '제25조의7', '제25조의8',
    '제26조', '제27조', '제28조', '제28조의2', '제28조의3', '제29조', '제33조', '제34조'
  ]

  const titleMap = {
    '제3조': '전세사기피해자의 요건', '제4조': '임차인보호대책의 수립', '제5조': '다른 법률과의 관계',
    '제6조': '전세사기피해지원위원회', '제10조': '전세사기피해지원단', '제14조': '전세사기피해자등 결정',
    '제14조의2': '전세사기피해자 재심의', '제15조': '이의신청', '제15조의2': '결정 유효기간',
    '제16조': '정보체계 구축', '제17조': '경매의 유예·정지', '제18조': '국세 체납 공매 특례',
    '제19조': '지방세 체납 공매 특례', '제20조': '경매절차에서의 우선매수권', '제21조': '국세징수법 공매 우선매수권',
    '제22조': '지방세징수법 공매 우선매수권', '제23조': '국세 우선징수 특례', '제24조': '지방세 우선징수 특례',
    '제25조': '공공주택사업자의 주택 취득 및 임대', '제25조의2': '공공임대주택 입주자격 특례',
    '제25조의3': '임시거소 제공', '제25조의4': '공공주택 매입·임대', '제25조의5': '자금지원',
    '제25조의6': '건축법 특례', '제25조의7': '주택임대차보호법 특례', '제25조의8': '임시거소 제공 사업',
    '제26조': '감정평가 비용 지원', '제27조': '금융지원', '제28조': '긴급복지지원',
    '제28조의2': '피해주택 특례', '제28조의3': '공무원 피해자 특례', '제29조': '권한 위임·위탁',
    '제33조': '벌칙', '제34조': '과태료'
  }

  for (const num of criticalArticles) {
    if (!byNum.has(num)) {
      const desc = getDesc(num, titleMap[num] || '')
      if (desc) {
        byNum.set(num, {
          number: num,
          title: titleMap[num] || '',
          content: desc, // description을 content로도 사용
          description: desc
        })
      }
    }
  }

  // 정렬
  const sorted = [...byNum.values()].sort((a, b) => {
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

  console.log(`\n최종 전세사기특별법 조문: ${sorted.length}개`)
  for (const a of sorted) {
    const type = a.content.length > 50 ? '[본문O]' : '[설명만]'
    console.log(`  ${type} ${a.number} ${a.title}`)
  }
}

main().catch(console.error)
