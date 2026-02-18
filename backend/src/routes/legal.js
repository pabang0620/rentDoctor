import { Router } from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

// 법령 데이터 캐시
let lawsCache = null
let casesCache = null

function getLawsData() {
  if (!lawsCache) {
    const path = join(__dirname, '../data/laws/jeonse-fraud-laws.json')
    lawsCache = JSON.parse(readFileSync(path, 'utf-8'))
  }
  return lawsCache
}

function getCasesData() {
  if (!casesCache) {
    const path = join(__dirname, '../data/cases/sample-cases.json')
    casesCache = JSON.parse(readFileSync(path, 'utf-8'))
  }
  return casesCache
}

/**
 * GET /api/legal/laws
 * 전체 법령 목록 조회
 */
router.get('/laws', (req, res) => {
  try {
    const data = getLawsData()
    const laws = data.laws.map(law => ({
      id: law.id,
      name: law.name,
      shortName: law.shortName,
      summary: law.summary || law.description,
      keywords: law.keywords
    }))

    res.json({ success: true, data: { laws } })
  } catch (error) {
    res.status(500).json({ success: false, error: '법령 데이터를 불러올 수 없습니다.' })
  }
})

/**
 * GET /api/legal/search?q=키워드
 * 법령 키워드 검색
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ success: false, error: '검색어(q)가 필요합니다.' })

    const data = getLawsData()
    const queryLower = q.toLowerCase()

    const laws = data.laws.filter(law => {
      const inKeywords = (law.keywords || []).some(k => k.toLowerCase().includes(queryLower) || queryLower.includes(k.toLowerCase()))
      const inName = law.name.toLowerCase().includes(queryLower)
      const inArticles = (law.articles || []).some(a =>
        (a.title || '').toLowerCase().includes(queryLower) ||
        (a.content || '').toLowerCase().includes(queryLower)
      )
      return inKeywords || inName || inArticles
    }).map(law => ({
      id: law.id,
      name: law.name,
      shortName: law.shortName,
      matchedArticles: (law.articles || [])
        .filter(a => (a.title || '').toLowerCase().includes(queryLower) || (a.content || '').toLowerCase().includes(queryLower))
        .slice(0, 3)
        .map(a => ({ number: a.number, title: a.title }))
    }))

    res.json({ success: true, data: { laws, query: q } })
  } catch (error) {
    res.status(500).json({ success: false, error: '검색 중 오류가 발생했습니다.' })
  }
})

/**
 * GET /api/legal/laws/:id
 * 특정 법령 상세 조회
 */
router.get('/laws/:id', (req, res) => {
  try {
    const data = getLawsData()
    const law = data.laws.find(l => l.id === req.params.id)

    if (!law) {
      return res.status(404).json({ success: false, error: '법령을 찾을 수 없습니다.' })
    }

    res.json({ success: true, data: { law } })
  } catch (error) {
    res.status(500).json({ success: false, error: '법령 데이터를 불러올 수 없습니다.' })
  }
})

/**
 * GET /api/legal/cases
 * 사례 목록 조회
 */
router.get('/cases', (req, res) => {
  try {
    const data = getCasesData()
    res.json({ success: true, data: { cases: data.cases } })
  } catch (error) {
    res.status(500).json({ success: false, error: '사례 데이터를 불러올 수 없습니다.' })
  }
})

/**
 * GET /api/legal/faq
 * 자주 묻는 질문 조회
 */
router.get('/faq', (req, res) => {
  try {
    const data = getLawsData()
    const allFaqs = []

    for (const law of data.laws) {
      if (law.commonQuestions) {
        allFaqs.push(...law.commonQuestions)
      }
    }

    res.json({ success: true, data: { faqs: allFaqs } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'FAQ 데이터를 불러올 수 없습니다.' })
  }
})

/**
 * GET /api/legal/support-agencies
 * 지원 기관 목록
 */
router.get('/support-agencies', (req, res) => {
  const agencies = [
    {
      name: '대한법률구조공단',
      phone: '132',
      website: 'www.klac.or.kr',
      description: '무료 법률 상담 및 소송 지원',
      services: ['무료 법률 상담', '소송 지원', '법률 서류 작성 지원'],
      category: '법률'
    },
    {
      name: '전세사기피해지원센터',
      phone: '1533-2020',
      website: 'jeonse.molit.go.kr',
      description: '전세사기 피해자 원스톱 지원 서비스',
      services: ['피해자 인정 신청', '주거 지원', '법률 연계'],
      category: '종합지원'
    },
    {
      name: '주택도시보증공사(HUG)',
      phone: '1566-9009',
      website: 'www.khug.or.kr',
      description: '전세보증보험 및 반환보증 관련',
      services: ['전세보증금 반환보증', '전세금안심대출', '보증사고 처리'],
      category: '보증보험'
    },
    {
      name: '한국주택금융공사(HF)',
      phone: '1688-8114',
      website: 'www.hf.go.kr',
      description: '전세지킴보증 및 금융 지원',
      services: ['전세지킴보증', '보금자리론'],
      category: '금융'
    },
    {
      name: 'LH 한국토지주택공사',
      phone: '1600-1004',
      website: 'www.lh.or.kr',
      description: '공공임대주택 및 이주 지원',
      services: ['공공임대주택 우선 입주', '전세임대주택', '매입임대주택'],
      category: '주거'
    },
    {
      name: '국번없이 경찰',
      phone: '112',
      description: '긴급 신고 및 형사 고소 접수',
      services: ['전세사기 형사 고소', '긴급 출동'],
      category: '형사'
    }
  ]

  res.json({ success: true, data: { agencies } })
})

export default router
