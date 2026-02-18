import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let lawsData = null
let casesData = null

function loadData() {
  if (!lawsData) {
    try {
      const lawsPath = join(__dirname, '../data/laws/jeonse-fraud-laws.json')
      lawsData = JSON.parse(readFileSync(lawsPath, 'utf-8'))
    } catch (error) {
      console.error('법령 데이터 로드 실패:', error)
      lawsData = { laws: [] }
    }
  }
  if (!casesData) {
    try {
      const casesPath = join(__dirname, '../data/cases/sample-cases.json')
      casesData = JSON.parse(readFileSync(casesPath, 'utf-8'))
    } catch (error) {
      console.error('사례 데이터 로드 실패:', error)
      casesData = { cases: [] }
    }
  }
}

/**
 * 조문 관련도 점수 계산
 */
function scoreArticle(article, queryWords) {
  const text = [article.title, article.content, article.description]
    .filter(Boolean).join(' ').toLowerCase()
  return queryWords.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0)
}

/**
 * 키워드 기반 관련 법령 검색
 */
export function searchRelevantLaws(query) {
  loadData()

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2)
  const results = []

  for (const law of lawsData.laws) {
    let score = 0

    // 법령 이름/약칭 매칭 (높은 가중치)
    if (queryLower.includes(law.name) || queryLower.includes(law.shortName || '')) {
      score += 10
    }

    // 키워드 매칭 (양방향)
    for (const keyword of law.keywords || []) {
      const kw = keyword.toLowerCase()
      if (queryWords.some(w => kw.includes(w) || w.includes(kw))) {
        score += 3
      }
    }

    // 조문 내용에서 쿼리 단어 매칭
    for (const article of law.articles || []) {
      if (scoreArticle(article, queryWords) > 0) score += 1
    }

    if (score > 0) results.push({ law, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 3).map(r => r.law)
}

/**
 * 관련 판례/사례 검색
 */
export function searchRelevantCases(query) {
  loadData()

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2)
  const results = []

  for (const caseItem of casesData.cases || []) {
    const caseText = [caseItem.type, caseItem.title, caseItem.summary]
      .filter(Boolean).join(' ').toLowerCase()

    let score = queryWords.reduce((s, w) => s + (caseText.includes(w) ? 2 : 0), 0)
    if (queryLower.includes(caseItem.type?.toLowerCase() || '')) score += 3

    if (score > 0) results.push({ case: caseItem, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 3).map(r => r.case)
}

/**
 * RAG 컨텍스트 생성
 * - 조문 전문(full content) 제공으로 AI가 정확한 근거 확보
 * - 할루시네이션 방지를 위해 "여기 없으면 모른다" 경계 명시
 */
export function buildRagContext(query) {
  const relevantLaws = searchRelevantLaws(query)
  const relevantCases = searchRelevantCases(query)

  if (relevantLaws.length === 0 && relevantCases.length === 0) {
    return '\n\n---\n## [관련 법령 및 판례]\n※ 이 질문과 직접 관련된 법령 데이터가 검색되지 않았습니다. 일반 법률 지식으로만 답변하고, 구체적 조문 번호는 인용하지 마세요.\n---\n'
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2)

  let context = '\n\n---\n## [관련 법령 및 판례]\n'
  context += '※ 아래에 제공된 조문과 판례만을 근거로 답변하세요. 아래에 없는 조문 번호나 판례는 절대 인용하지 마세요.\n\n'

  for (const law of relevantLaws) {
    context += `### ${law.name}${law.shortName ? ` (약칭: ${law.shortName})` : ''}\n\n`

    // 관련도 높은 조문 우선, 최대 8개 (할루시네이션 방지를 위해 충분한 데이터 제공)
    const scoredArticles = (law.articles || [])
      .map(article => ({ article, score: scoreArticle(article, queryWords) }))
      .sort((a, b) => b.score - a.score)

    const topArticles = scoredArticles.filter(a => a.score > 0).slice(0, 8)
    // 관련 조문 없으면 법령의 첫 5개 조문 제공
    const articles = topArticles.length > 0
      ? topArticles.map(a => a.article)
      : (law.articles || []).slice(0, 5)

    for (const article of articles) {
      context += `**${article.number}${article.title ? `(${article.title})` : ''}**\n`
      // 조문 전문 제공 (최대 600자) - 충분한 내용으로 추측 방지
      if (article.content && article.content.length > 20) {
        context += `${article.content.slice(0, 600)}\n`
      } else if (article.description) {
        context += `${article.description}\n`
      }
      context += '\n'
    }

    // 소액임차인 최우선변제 기준표 (정확한 수치 제공)
    const article8 = (law.articles || []).find(a => a.number === '제8조')
    if (article8?.amounts) {
      context += `**소액임차인 최우선변제 기준 (2024년 현재, 제8조):**\n`
      const regionMap = [
        { key: '서울', label: '서울특별시' },
        { key: '수도권과밀억제권역_세종_용인_화성_김포', label: '수도권 과밀억제권역·세종·용인·화성·김포' },
        { key: '광역시_안산_광주_파주_이천_평택', label: '광역시·안산·광주·파주·이천·평택' },
        { key: '그_외_지역', label: '그 외 지역' },
      ]
      for (const { key, label } of regionMap) {
        const r = article8.amounts[key]
        if (r) context += `- ${label}: 보증금 ${r.보증금상한} 이하인 경우 최대 ${r.최우선변제액} 우선변제\n`
      }
      context += '\n'
    }
  }

  if (relevantCases.length > 0) {
    context += '### 관련 판례\n\n'
    for (const caseItem of relevantCases) {
      const caseNum = caseItem.caseNumber ? ` [${caseItem.caseNumber}]` : ' [판례번호 미제공]'
      context += `**${caseItem.title}**${caseNum}\n`
      if (caseItem.summary) context += `판결 요지: ${caseItem.summary.slice(0, 300)}\n`
      if (caseItem.lessons?.length > 0) {
        context += `실무 포인트: ${caseItem.lessons.slice(0, 2).join(' / ')}\n`
      }
      context += '\n'
    }
  }

  context += '※ 위 데이터에 없는 법령·판례·수치는 인용하지 말고, 전문가 확인을 안내하세요.\n'
  context += '---\n'
  return context
}

export default { searchRelevantLaws, searchRelevantCases, buildRagContext }
