import { searchRelevantLaws, searchRelevantCases } from './ragService.js'

/**
 * 법령 검색 서비스
 * 사용자 질문에서 핵심 키워드를 추출하여 관련 법령을 검색합니다
 */

/**
 * 전세사기 관련 핵심 키워드 추출
 */
export function extractKeywords(query) {
  const keywords = []
  const keywordPatterns = [
    { pattern: /확정일자|확정 일자/, keyword: '확정일자' },
    { pattern: /전입신고|전입 신고/, keyword: '전입신고' },
    { pattern: /보증금|전세금/, keyword: '보증금' },
    { pattern: /대항력/, keyword: '대항력' },
    { pattern: /우선변제권|우선 변제/, keyword: '우선변제권' },
    { pattern: /최우선변제|소액임차인/, keyword: '최우선변제권' },
    { pattern: /임차권등기|임차권 등기/, keyword: '임차권등기' },
    { pattern: /경매|공매/, keyword: '경매' },
    { pattern: /HUG|허그|전세보증보험|주택도시보증/, keyword: 'HUG' },
    { pattern: /특별법|전세사기특별법/, keyword: '전세사기특별법' },
    { pattern: /우선매수권/, keyword: '우선매수권' },
    { pattern: /근저당|근 저당/, keyword: '근저당' },
    { pattern: /계약갱신|갱신/, keyword: '계약갱신' },
    { pattern: /묵시적 갱신|자동갱신/, keyword: '묵시적갱신' }
  ]

  for (const { pattern, keyword } of keywordPatterns) {
    if (pattern.test(query)) {
      keywords.push(keyword)
    }
  }

  return keywords
}

/**
 * 법령 정보 조회
 */
export function getLawInfo(lawId) {
  const { laws } = getLawsData()
  return laws.find(l => l.id === lawId) || null
}

/**
 * 전체 법령 목록 조회
 */
export function getAllLaws() {
  const { laws } = getLawsData()
  return laws.map(law => ({
    id: law.id,
    name: law.name,
    shortName: law.shortName,
    summary: law.summary || law.description
  }))
}

function getLawsData() {
  // ragService에서 이미 로드한 데이터 활용
  // 실제로는 공유 캐시나 데이터베이스를 사용
  try {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    return JSON.parse(readFileSync(join(__dirname, '../data/laws/jeonse-fraud-laws.json'), 'utf-8'))
  } catch {
    return { laws: [] }
  }
}

/**
 * 질문 유형 분류
 */
export function classifyQuery(query) {
  const types = []

  if (/경매|공매|배당|낙찰/.test(query)) types.push('경매/공매')
  if (/전입신고|확정일자|대항력/.test(query)) types.push('대항력')
  if (/보증금 반환|보증금 돌려|돈을 돌려/.test(query)) types.push('보증금반환')
  if (/임차권등기/.test(query)) types.push('임차권등기')
  if (/고소|고발|형사/.test(query)) types.push('형사절차')
  if (/HUG|보증보험|반환보증/.test(query)) types.push('보증보험')
  if (/특별법|피해자 인정|지원/.test(query)) types.push('특별법지원')
  if (/계약갱신|갱신거절|묵시적/.test(query)) types.push('계약갱신')

  return types.length > 0 ? types : ['일반상담']
}

export default { extractKeywords, getLawInfo, getAllLaws, classifyQuery }
