/**
 * 크롤링한 데이터를 백엔드 JSON 파일로 병합
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendData = join(__dirname, '../backend/src/data')

function generateDescription(number, title, content) {
  const descMap = {
    '제3조': '전입신고(주민등록)와 실제 거주(인도)를 마치면 그 다음날부터 제3자에게 임차권을 주장할 수 있는 대항력이 생깁니다.',
    '제3조의2': '전입신고 + 확정일자를 모두 갖추면 경매/공매 시 후순위 채권자보다 먼저 보증금을 변제받을 수 있습니다.',
    '제3조의3': '임차권등기명령 신청 시, 이사 후에도 대항력과 우선변제권을 유지할 수 있습니다. 이사 전 신청 필수.',
    '제4조': '기간을 정하지 않거나 2년 미만으로 계약해도 임차인은 2년을 주장할 수 있습니다. 보증금 반환 전까지 임대차 관계 유지.',
    '제6조': '집주인이 계약 만료 6~2개월 전에 갱신거절을 통보하지 않으면 동일 조건으로 자동 갱신됩니다.',
    '제6조의3': '임차인은 1회에 한해 계약갱신을 요구할 수 있으며, 이 경우 보증금은 5% 이내에서만 증액 가능합니다.',
    '제7조': '보증금 또는 차임 증액은 5%를 초과할 수 없습니다. 증액 후 1년 이내에는 다시 증액청구 불가.',
    '제8조': '소액임차인은 경매/공매 배당에서 담보물권자보다 먼저 보증금 일부를 받을 수 있는 최우선변제권을 가집니다.',
    '제1조': '이 법의 목적을 규정합니다.',
    '제2조': '주요 용어를 정의합니다.',
  }

  if (descMap[number]) return descMap[number]

  const t = (title || '').toLowerCase()
  const c = (content || '').slice(0, 50)

  if (t.includes('대항력') || c.includes('대항력')) return '임차인의 대항력에 관한 조항입니다.'
  if (t.includes('우선변제') || c.includes('우선변제')) return '임차인의 우선변제권에 관한 조항입니다.'
  if (t.includes('갱신') || c.includes('갱신')) return '임대차 계약 갱신에 관한 조항입니다.'
  if (t.includes('등기') || c.includes('등기')) return '임차권 등기에 관한 조항입니다.'
  if (t.includes('보증금') || c.includes('보증금')) return '보증금 보호에 관한 조항입니다.'
  if (t.includes('피해자') || c.includes('피해자')) return '전세사기 피해자 지원에 관한 조항입니다.'
  if (t.includes('우선매수') || c.includes('우선매수')) return '경매/공매 시 피해자의 우선매수권에 관한 조항입니다.'
  if (t.includes('경매') || c.includes('경매')) return '경매 절차에서의 임차인 권리에 관한 조항입니다.'

  return content.slice(0, 80).trim()
}

function cleanArticles(articles) {
  return articles
    .filter(a => {
      // 내용이 없거나 너무 짧은 조문 제거
      const content = (a.content || '').trim()
      return content.length > 15 && !content.startsWith('(') // "(제목만있는경우..." 제거
    })
    .map(a => ({
      number: a.number,
      title: a.title || '',
      content: a.content.trim(),
      description: a.description || generateDescription(a.number, a.title, a.content)
    }))
}

async function main() {
  console.log('=== 크롤링 데이터 → 백엔드 병합 ===\n')

  // 1. 법령 데이터 병합
  console.log('[1] 법령 데이터 병합...')
  const crawledLaws = JSON.parse(
    readFileSync(join(__dirname, 'output/laws-final.json'), 'utf-8')
  )

  // 전세사기특별법 별도 크롤 데이터 (조문 목록에서 내용 없는 것들)
  // → 실제 내용은 하단 본문에 있음, 현재 데이터에서 내용 있는 것만 필터링
  const processedLaws = crawledLaws.laws.map(law => ({
    ...law,
    articles: cleanArticles(law.articles)
  }))

  // 기존 백엔드 JSON과 병합 (keywords는 기존 것 유지, 조문은 크롤링 데이터로 교체)
  const existingLaws = JSON.parse(
    readFileSync(join(backendData, 'laws/jeonse-fraud-laws.json'), 'utf-8')
  )

  // 크롤링한 법령을 기존 법령에 병합 (id 매칭)
  const mergedLaws = [...existingLaws.laws]

  for (const crawled of processedLaws) {
    const existingIdx = mergedLaws.findIndex(l => l.id === crawled.id)
    if (existingIdx >= 0) {
      // 기존 항목 업데이트 (조문 교체, keywords 유지)
      mergedLaws[existingIdx] = {
        ...mergedLaws[existingIdx],
        ...crawled,
        keywords: mergedLaws[existingIdx].keywords || crawled.keywords,
        crawledAt: crawled.crawledAt
      }
      console.log(`  ✅ 업데이트: ${crawled.name} (${crawled.articles.length}개 조문)`)
    } else {
      mergedLaws.push(crawled)
      console.log(`  ➕ 추가: ${crawled.name} (${crawled.articles.length}개 조문)`)
    }
  }

  const lawsOutput = {
    version: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString(),
    laws: mergedLaws
  }

  writeFileSync(
    join(backendData, 'laws/jeonse-fraud-laws.json'),
    JSON.stringify(lawsOutput, null, 2),
    'utf-8'
  )
  console.log(`  저장: backend/src/data/laws/jeonse-fraud-laws.json`)

  // 2. 판례 데이터 병합
  console.log('\n[2] 판례 데이터 병합...')
  const crawledCases = JSON.parse(
    readFileSync(join(__dirname, 'output/cases-final.json'), 'utf-8')
  )

  // 기존 사례 데이터 읽기
  const existingCases = JSON.parse(
    readFileSync(join(backendData, 'cases/sample-cases.json'), 'utf-8')
  )

  // 판례번호 중복 제거 후 병합
  const existingNums = new Set(existingCases.cases.map(c => c.caseNumber).filter(Boolean))
  const newCases = crawledCases.cases.filter(c => {
    if (!c.caseNumber) return true // 번호 없는 것은 일단 포함
    return !existingNums.has(c.caseNumber)
  })

  // 내용 품질 필터링
  const qualityCases = newCases.filter(c => {
    const summary = c.summary || ''
    return summary.length > 30 && (c.caseNumber || c.title.length > 10)
  })

  const mergedCases = [
    ...existingCases.cases,
    ...qualityCases
  ]

  const casesOutput = {
    version: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString(),
    totalCount: mergedCases.length,
    cases: mergedCases
  }

  writeFileSync(
    join(backendData, 'cases/sample-cases.json'),
    JSON.stringify(casesOutput, null, 2),
    'utf-8'
  )
  console.log(`  기존: ${existingCases.cases.length}건`)
  console.log(`  신규 추가: ${qualityCases.length}건`)
  console.log(`  최종: ${mergedCases.length}건`)
  console.log(`  저장: backend/src/data/cases/sample-cases.json`)

  // 3. 최종 요약
  console.log('\n=== 병합 완료 ===')
  console.log(`법령: ${mergedLaws.length}개 (총 조문: ${mergedLaws.reduce((s, l) => s + (l.articles?.length || 0), 0)}개)`)
  console.log(`판례: ${mergedCases.length}건`)
  console.log('\n법령별 조문 수:')
  for (const l of mergedLaws) {
    console.log(`  - ${l.name}: ${l.articles?.length || 0}개`)
  }
  console.log('\n판례 유형별:')
  const byType = {}
  for (const c of mergedCases) byType[c.type || '기타'] = (byType[c.type || '기타'] || 0) + 1
  for (const [t, n] of Object.entries(byType)) console.log(`  - ${t}: ${n}건`)
}

main().catch(console.error)
