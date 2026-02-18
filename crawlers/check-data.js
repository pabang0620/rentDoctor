import { readFileSync } from 'fs'

const laws = JSON.parse(readFileSync('/home/pabang/myapp/lawyer/backend/src/data/laws/jeonse-fraud-laws.json', 'utf-8'))
const cases = JSON.parse(readFileSync('/home/pabang/myapp/lawyer/backend/src/data/cases/sample-cases.json', 'utf-8'))

console.log('==================== 법령 데이터 검사 ====================')
for (const law of laws.laws) {
  console.log('\n[법령]', law.name, `(${law.articles?.length || 0}개 조문)`)
  console.log('키워드:', (law.keywords || []).join(', '))
  console.log('----------------------------------------------------------')

  const articles = law.articles || []
  let okCount = 0
  let badCount = 0

  for (const a of articles) {
    const content = a.content || ''
    // 내용이 괄호로 시작하거나 너무 짧으면 불량
    const isBad = content.length < 20 || content.startsWith('(') || content.endsWith('...')
    const mark = isBad ? '[X]' : '[O]'
    if (isBad) badCount++
    else okCount++
    console.log(`  ${mark} ${a.number} ${a.title} | ${content.slice(0, 70)}`)
  }
  console.log(`  → 정상: ${okCount}개 / 불량: ${badCount}개`)
}

console.log('\n==================== 판례 데이터 검사 ====================')
let caseOk = 0, caseBad = 0
for (const c of cases.cases) {
  const summary = c.summary || ''
  const hasNum = !!c.caseNumber
  const hasContent = summary.length > 50
  const isGood = hasNum && hasContent
  const mark = isGood ? '[O]' : '[X]'
  if (isGood) caseOk++
  else caseBad++
  console.log(`${mark} [${c.type}] ${c.caseNumber || '번호없음'} | ${summary.slice(0, 60)}`)
}
console.log(`\n→ 정상: ${caseOk}건 / 보완필요: ${caseBad}건`)

console.log('\n==================== 누락 법령 체크 ====================')
const expectedLaws = [
  '주택임대차보호법',
  '주택임대차보호법 시행령',
  '전세사기피해자 지원 및 주거안정에 관한 특별법',
  '임차권등기명령 절차에 관한 규칙',
]
for (const name of expectedLaws) {
  const found = laws.laws.find(l => l.name.includes(name.slice(0, 8)))
  console.log(`  ${found ? '[O]' : '[X]'} ${name} → ${found ? found.articles.length + '개 조문' : '없음'}`)
}
