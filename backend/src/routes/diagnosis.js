import { Router } from 'express'
import { analyzeDiagnosis } from '../services/aiService.js'
import { saveDiagnosis } from '../services/dbService.js'
import { diagnosisLimiter } from '../middleware/rateLimiter.js'

const router = Router()

/**
 * 체크리스트 항목 정의
 */
const CHECKLIST_ITEMS = {
  registrationChecked: {
    label: '등기부등본 확인 여부',
    weight: 15,
    risk: '등기부등본을 확인하지 않으면 근저당, 압류 등 숨겨진 권리를 알 수 없습니다.'
  },
  ownerIdentityVerified: {
    label: '집주인 신원 확인',
    weight: 10,
    risk: '집주인 신원 미확인 시 사기 피해 위험이 높습니다.'
  },
  registrationAndDate: {
    label: '전입신고 및 확정일자 취득',
    weight: 20,
    risk: '전입신고와 확정일자 없이는 대항력과 우선변제권이 없습니다.'
  },
  highJeonseRate: {
    label: '전세가율 80% 초과 (시세 대비 보증금 비율)',
    weight: 15,
    risk: '전세가율이 높을수록 경매 시 보증금 회수 가능성이 낮습니다.'
  },
  mortgageExists: {
    label: '근저당권 설정 여부',
    weight: 15,
    risk: '근저당이 있으면 경매 시 배당 순위에서 밀릴 수 있습니다.'
  },
  noHugInsurance: {
    label: 'HUG 전세보증보험 미가입',
    weight: 10,
    risk: '전세보증보험 없이는 집주인 잠적 시 보증금 회수가 어렵습니다.'
  },
  taxDelinquency: {
    label: '임대인 세금 체납 의심',
    weight: 10,
    risk: '세금 체납이 있으면 국가가 우선 변제받아 보증금 회수가 어렵습니다.'
  },
  corporateOwner: {
    label: '집주인이 법인 또는 신탁회사',
    weight: 5,
    risk: '법인 소유 주택은 개인 소유보다 복잡한 권리관계를 가질 수 있습니다.'
  },
  multiUnitBuilding: {
    label: '다세대/빌라/오피스텔 주택',
    weight: 5,
    risk: '다세대/빌라는 아파트보다 깡통전세 위험이 높습니다.'
  },
  ownerUnreachable: {
    label: '임대인 연락 두절 또는 계약 회피',
    weight: 20,
    risk: '즉각적인 대응이 필요한 매우 심각한 상황입니다.'
  }
}

/**
 * 위험도 계산
 */
function calculateRiskScore(checks) {
  let totalScore = 0
  let maxScore = 0

  for (const [key, item] of Object.entries(CHECKLIST_ITEMS)) {
    maxScore += item.weight

    // 위험 항목이 해당되면 점수 추가
    const isRisk = isRiskFactor(key, checks[key])
    if (isRisk) {
      totalScore += item.weight
    }
  }

  return Math.round((totalScore / maxScore) * 100)
}

/**
 * 각 항목별 위험 여부 판단
 */
function isRiskFactor(key, value) {
  const riskWhenTrue = ['highJeonseRate', 'mortgageExists', 'noHugInsurance', 'taxDelinquency', 'corporateOwner', 'multiUnitBuilding', 'ownerUnreachable']
  const riskWhenFalse = ['registrationChecked', 'ownerIdentityVerified', 'registrationAndDate']

  if (riskWhenTrue.includes(key)) return value === true
  if (riskWhenFalse.includes(key)) return value === false
  return false
}

/**
 * 위험도 레벨 변환
 */
function getRiskLevel(score) {
  if (score >= 70) return '매우높음'
  if (score >= 50) return '높음'
  if (score >= 30) return '중간'
  return '낮음'
}

/**
 * 즉각 조치 사항 생성 (계약 만료일 포함)
 * 반환 형식: { title, urgency('now'|'soon'|'check'), steps[], contact? }
 */
function getImmediateActions(checks, riskScore, contractInfo) {
  const actions = []

  // 1. 계약 만료일 기준 최우선 조치
  if (contractInfo) {
    if (contractInfo.status === 'expired' || contractInfo.status === 'today') {
      actions.push({
        title: '임차권등기명령 즉시 신청',
        urgency: 'now',
        steps: [
          '이사 나가기 전에 반드시 완료하세요 — 이사 후엔 대항력을 잃어 보증금 청구가 훨씬 어려워집니다',
          '신청 방법: ①인터넷 — 대법원 전자소송(ecfs.scourt.go.kr) 접속 후 "임차권등기명령" 검색 / ②직접 방문 — 집 주소 관할 지방법원 등기과',
          '챙겨갈 서류: 임대차계약서 사본, 주민등록등본, 건물 등기부등본 (각 1통 — 주민센터·등기소에서 발급, 각 700~1,000원)',
          '법원 도착 후 "임차권등기명령 신청하러 왔습니다"라고 말하면 직원이 안내합니다 (인지대 약 15,000원)',
          '접수 후 약 1~2주 내 등기부등본에 임차권이 등록됩니다'
        ],
        contact: { name: '대법원 전자소송', phone: '1588-0090' }
      })
      if (!checks.noHugInsurance) {
        actions.push({
          title: 'HUG 전세보증보험 청구',
          urgency: 'now',
          steps: [
            '전세보증보험이 있으면 집주인 대신 HUG가 보증금을 먼저 돌려줍니다 — 오늘 바로 청구하세요',
            'HUG 콜센터(1566-9009)에 전화 → "전세보증보험 청구하고 싶습니다"라고 말하면 절차를 안내해줍니다',
            '준비 서류: 임대차계약서, 주민등록등본(전입세대열람원), 확정일자 증명서, 신분증',
            '청구 기한이 있으니 오늘 전화하여 기한을 먼저 확인하세요'
          ],
          contact: { name: '주택도시보증공사(HUG)', phone: '1566-9009' }
        })
      }
      actions.push({
        title: '집주인에게 내용증명 발송',
        urgency: 'now',
        steps: [
          '내용증명은 "이 날짜에 이 내용을 집주인에게 보냈다"는 사실을 우체국이 공식 증명해주는 서류입니다',
          '작성 내용: ①임대차 계약 기간과 보증금액 ②보증금 반환 요청 ③반환 기한(예: 통보 후 7일 이내)',
          'A4용지에 작성 후 동일 내용 3부 출력 → 가까운 우체국 방문 → "내용증명 보내러 왔습니다"라고 말하면 됩니다',
          '비용: 약 5,000~7,000원 / 수령증은 반드시 보관 — 집주인이 수령 거부해도 법적 효력은 유지됩니다'
        ]
      })
    } else if (contractInfo.status === 'urgent') {
      actions.push({
        title: `HUG 전세보증보험 청구 가능 여부 확인 (만료 ${contractInfo.days}일 전)`,
        urgency: 'now',
        steps: [
          `HUG 콜센터(1566-9009)에 전화 → "계약 만료가 ${contractInfo.days}일 남았는데 전세보증보험 청구가 가능한지 확인하고 싶습니다"라고 말하세요`,
          '청구 가능하다면 즉시 청구 절차를 시작하세요 — 기한 초과 시 청구 불가',
          '준비 서류: 임대차계약서, 주민등록등본(전입세대열람원), 확정일자 증명서'
        ],
        contact: { name: '주택도시보증공사(HUG)', phone: '1566-9009' }
      })
      actions.push({
        title: '집주인에게 보증금 반환 의사 확인',
        urgency: 'now',
        steps: [
          '집주인에게 "계약 만료일에 보증금 반환이 가능한지" 문자 또는 카카오톡으로 확인하세요 — 대화 내용이 증거가 됩니다',
          '3일 이내 답변이 없거나 미룬다면 즉시 내용증명을 발송하세요',
          '임차권등기명령 신청 서류도 미리 준비해두세요: 임대차계약서 사본, 주민등록등본, 건물 등기부등본'
        ]
      })
    }
  }

  // 2. 전입신고·확정일자 미취득
  if (!checks.registrationAndDate) {
    actions.push({
      title: '전입신고 및 확정일자 즉시 취득',
      urgency: 'now',
      steps: [
        '전입신고를 해야 대항력이 생겨 집이 경매로 넘어가도 보증금을 보호받을 수 있습니다 — 지금 당장 처리하세요',
        '내 집 주소의 관할 주민센터(동사무소)를 방문하세요',
        '챙겨갈 것: ①임대차계약서 원본 ②신분증 → "전입신고하고 확정일자 받으러 왔습니다"라고 말하면 됩니다',
        '비용: 무료 / 처리시간: 약 20~30분 — 전입신고 다음 날 0시부터 대항력이 발생합니다'
      ]
    })
  }

  // 3. 임대인 연락 두절
  if (checks.ownerUnreachable) {
    if (!contractInfo || ['safe', 'soon'].includes(contractInfo.status)) {
      actions.push({
        title: '집주인에게 내용증명 발송',
        urgency: 'now',
        steps: [
          '내용증명은 "보증금 반환을 공식 요청했다"는 법적 증거입니다 — 이후 소송 시 필수 서류입니다',
          '작성: ①임대차 계약 기간과 보증금액 ②반환 요청 및 기한(예: 통보일로부터 7일 이내) ③내 연락처',
          'A4용지 3부 출력 → 우체국 방문 → "내용증명 보내러 왔습니다" 안내 요청 → 집주인 주소지로 발송',
          '비용: 약 5,000~7,000원 / 수령증은 반드시 보관 — 집주인이 수령 거부해도 법적 효력은 유지됩니다'
        ]
      })
      actions.push({
        title: '임차권등기명령 신청',
        urgency: 'now',
        steps: [
          '이사 나가기 전에 반드시 완료하세요 — 이사 후엔 대항력을 잃어 청구가 훨씬 어려워집니다',
          '신청 방법: ①인터넷 — 대법원 전자소송(ecfs.scourt.go.kr) / ②직접 방문 — 집 주소 관할 지방법원 등기과',
          '챙겨갈 서류: 임대차계약서 사본, 주민등록등본, 건물 등기부등본 (각 1통)',
          '"임차권등기명령 신청하러 왔습니다"라고 말하면 됩니다 (인지대 약 15,000원)'
        ],
        contact: { name: '대법원 전자소송', phone: '1588-0090' }
      })
    }
  }

  // 4. HUG 보험 청구 (가입 상태인 경우)
  if (!checks.noHugInsurance) {
    if (!contractInfo || contractInfo.status === 'safe') {
      actions.push({
        title: 'HUG 전세보증보험 청구 절차 시작',
        urgency: 'soon',
        steps: [
          '전세보증보험이 있으면 집주인 대신 HUG가 보증금을 먼저 돌려줍니다 (이후 HUG가 집주인에게 청구)',
          'HUG 콜센터(1566-9009)에 전화 → "전세보증보험 청구하고 싶습니다"라고 말하면 절차를 안내해줍니다',
          '준비 서류: 임대차계약서, 주민등록등본(전입세대열람원), 확정일자 증명서, 신분증'
        ],
        contact: { name: '주택도시보증공사(HUG)', phone: '1566-9009' }
      })
    }
  } else if (riskScore >= 50 && (!contractInfo || !['expired', 'today', 'urgent'].includes(contractInfo.status))) {
    actions.push({
      title: 'HUG 전세보증보험 가입 가능 여부 확인',
      urgency: 'check',
      steps: [
        '전세보증보험이 없으면 집주인 잠적 시 보증금 회수 수단이 크게 줄어듭니다 — 지금 가입이 가능한지 확인하세요',
        'HUG 콜센터(1566-9009)에 전화 → "지금 전세보증보험 가입이 가능한지 확인하고 싶습니다"라고 말하세요',
        '가입 조건: 계약기간 절반 이하 경과, 주택가격 기준 이하 등 (직원이 안내)',
        '가입 가능하다면 즉시 신청하세요 — 연간 보험료는 보증금의 약 0.1~0.4%'
      ],
      contact: { name: '주택도시보증공사(HUG)', phone: '1566-9009' }
    })
  }

  // 5. 전문가 상담 (riskScore >= 50)
  if (riskScore >= 50) {
    actions.push({
      title: '대한법률구조공단 무료 법률 상담',
      urgency: 'soon',
      steps: [
        '전세사기 피해자는 소득·재산과 무관하게 무료로 법률 지원을 받을 수 있습니다',
        '132에 전화 → "전세사기 피해자인데 법률 상담이 필요합니다"라고 말하면 상담을 연결해줍니다',
        '방문 상담 시 챙겨갈 것: 임대차계약서, 등기부등본, 문자/카카오톡 내역 캡처, 송금 내역',
        '전화 상담과 방문 상담 모두 가능 — 필요 시 소송 비용까지 무료 지원해줍니다'
      ],
      contact: { name: '대한법률구조공단', phone: '132' }
    })
    actions.push({
      title: '전세사기피해지원센터 접수',
      urgency: 'soon',
      steps: [
        '법률·금융·주거 지원을 한 곳에서 받을 수 있습니다',
        '온라인 신청: jeonse.or.kr 접속 → 피해 신청 / 전화: 1533-2020',
        '"전세사기 피해자로 지원 신청하고 싶습니다"라고 말하면 담당자가 배정됩니다',
        '지원 내용: 법률 자문, 긴급 생계비 지원, 임시 주거 연계, 분쟁 조정 등'
      ],
      contact: { name: '전세사기피해지원센터', phone: '1533-2020' }
    })
  }

  // 6. 형사 고소 검토 (riskScore >= 70)
  if (riskScore >= 70) {
    actions.push({
      title: '형사 고소 검토',
      urgency: 'check',
      steps: [
        '먼저 대한법률구조공단(132)에 상담하여 형사 고소 가능 여부를 확인하세요 — 혼자 진행하면 실수하기 쉽습니다',
        '고소장 준비: ①피해 사실 정리 ②증거 자료(계약서, 문자, 입금내역 등) ③"사기" 혐의로 작성',
        '관할 경찰서 민원실 또는 경찰청 전세사기 전담 수사팀(182)에 고소장 접수',
        '접수 후 사건번호를 받아두세요 — 추후 진행 상황 확인 시 필요합니다'
      ],
      contact: { name: '경찰청 전세사기 전담팀', phone: '182' }
    })
  }

  // 7. 기본 예방 조치 (위험도 낮을 때)
  if (actions.length === 0) {
    actions.push({
      title: '등기부등본 정기 확인',
      urgency: 'check',
      steps: [
        '대법원 인터넷등기소(iros.go.kr) 접속 → 주소 검색 → 열람 신청 (비용: 열람 700원, 발급 1,000원)',
        '확인 항목: 근저당권, 압류, 가처분 등 권리 변동 사항',
        '1~2개월마다 정기적으로 확인하고, 이상 발견 시 즉시 대한법률구조공단(132)에 상담하세요'
      ]
    })
    actions.push({
      title: '집주인 세금 납부 여부 확인',
      urgency: 'check',
      steps: [
        '집주인에게 납세증명서 발급에 동의해달라고 요청하세요 — 집주인이 거부하면 그 자체가 위험 신호입니다',
        '납세증명서는 관할 세무서에서 집주인 동의 하에 발급 가능합니다',
        '체납 내역 발견 시 즉시 대한법률구조공단(132)에 상담하세요'
      ]
    })
  }

  return actions
}

/**
 * 계약 만료일 분석
 */
function analyzeContractDate(contractEndDate) {
  if (!contractEndDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(contractEndDate)
  if (isNaN(end.getTime())) return null
  end.setHours(0, 0, 0, 0)

  const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays), label: `만료 후 ${Math.abs(diffDays)}일 경과` }
  if (diffDays === 0) return { status: 'today', days: 0, label: '오늘이 만료일' }
  if (diffDays <= 30) return { status: 'urgent', days: diffDays, label: `만료 ${diffDays}일 전` }
  if (diffDays <= 90) return { status: 'soon', days: diffDays, label: `만료 ${diffDays}일 전` }
  return { status: 'safe', days: diffDays, label: `만료 ${diffDays}일 전` }
}

/**
 * POST /api/diagnosis
 * 전세사기 피해 진단
 */
router.post('/', diagnosisLimiter, async (req, res, next) => {
  try {
    const { checks, additionalInfo, useAI = false, contractEndDate } = req.body

    if (!checks || typeof checks !== 'object') {
      return res.status(400).json({
        success: false,
        error: '진단 체크리스트 데이터가 필요합니다.',
        code: 'INVALID_CHECKS'
      })
    }

    // 계약 만료일 분석
    const contractInfo = analyzeContractDate(contractEndDate)

    // 위험도 점수 계산 (만료된 경우 가산점)
    let riskScore = calculateRiskScore(checks)
    if (contractInfo?.status === 'expired' || contractInfo?.status === 'today') {
      riskScore = Math.min(100, riskScore + 15)
    } else if (contractInfo?.status === 'urgent') {
      riskScore = Math.min(100, riskScore + 8)
    }
    const riskLevel = getRiskLevel(riskScore)

    // 위험 요소 파악
    const mainRisks = []
    for (const [key, item] of Object.entries(CHECKLIST_ITEMS)) {
      if (isRiskFactor(key, checks[key])) {
        mainRisks.push(item.risk)
      }
    }
    if (contractInfo?.status === 'expired') {
      mainRisks.unshift(`계약 만료 후 ${contractInfo.days}일 경과 — 즉시 법적 대응이 필요한 상황`)
    } else if (contractInfo?.status === 'today') {
      mainRisks.unshift('오늘이 계약 만료일 — 즉각적인 조치가 필요합니다')
    } else if (contractInfo?.status === 'urgent') {
      mainRisks.unshift(`계약 만료 ${contractInfo.days}일 전 — 보증금 반환 준비가 시급합니다`)
    }

    // 즉각 조치 사항
    const immediateActions = getImmediateActions(checks, riskScore, contractInfo)

    // 지원 기관 목록
    const supportAgencies = [
      { name: '대한법률구조공단', phone: '132', description: '무료 법률 상담 및 소송 지원' },
      { name: '전세사기피해지원센터', phone: '1533-2020', description: '피해자 원스톱 지원' }
    ]

    if (!checks.noHugInsurance) {
      supportAgencies.push({ name: '주택도시보증공사(HUG)', phone: '1566-9009', description: '전세보증보험 청구' })
    }

    if (riskScore >= 70) {
      supportAgencies.push({ name: '경찰청 전세사기 전담팀', phone: '182', description: '형사 고소 접수' })
    }

    // AI 분석 (선택적)
    let aiAnalysis = null
    if (useAI && process.env.GEMINI_API_KEY) {
      try {
        aiAnalysis = await analyzeDiagnosis({ checks, additionalInfo })
      } catch (aiError) {
        console.error('AI 분석 실패, 기본 분석 결과 반환:', aiError.message)
      }
    }

    const result = aiAnalysis || {
      riskLevel,
      riskScore,
      mainRisks: mainRisks.slice(0, 4),
      immediateActions,
      supportAgencies,
      summary: generateSummary(riskLevel, riskScore, mainRisks, contractInfo),
      contractInfo: contractInfo || undefined
    }

    // DB에 비동기 저장
    const { sessionId } = req.body
    saveDiagnosis(sessionId || null, { checks, additionalInfo }, result).catch(() => {})

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    next(error)
  }
})

function generateSummary(riskLevel, riskScore, mainRisks, contractInfo) {
  let dateContext = ''
  if (contractInfo?.status === 'expired') {
    dateContext = ` 계약이 이미 만료된 지 ${contractInfo.days}일이 경과했습니다.`
  } else if (contractInfo?.status === 'today') {
    dateContext = ' 오늘이 계약 만료일입니다.'
  } else if (contractInfo?.status === 'urgent') {
    dateContext = ` 계약 만료까지 ${contractInfo.days}일밖에 남지 않았습니다.`
  }

  if (riskLevel === '매우높음') {
    return `전세사기 피해 가능성이 매우 높습니다 (위험도: ${riskScore}점).${dateContext} 즉각적인 법적 조치가 필요합니다. 대한법률구조공단(132)에 오늘 바로 연락하시기 바랍니다.`
  } else if (riskLevel === '높음') {
    return `전세사기 피해 가능성이 높습니다 (위험도: ${riskScore}점).${dateContext} 빠른 시일 내에 법률 전문가 상담을 받으시기 바랍니다.`
  } else if (riskLevel === '중간') {
    return `일부 위험 요소가 있습니다 (위험도: ${riskScore}점).${dateContext} 관련 서류를 정비하고 전문가 상담을 권장합니다.`
  } else {
    return `현재 위험도가 낮은 편입니다 (위험도: ${riskScore}점).${dateContext} 지속적인 모니터링과 예방 조치를 권장합니다.`
  }
}

/**
 * GET /api/diagnosis/checklist
 * 체크리스트 항목 조회
 */
router.get('/checklist', (req, res) => {
  res.json({
    success: true,
    data: {
      items: Object.entries(CHECKLIST_ITEMS).map(([key, item]) => ({
        key,
        label: item.label,
        risk: item.risk
      }))
    }
  })
})

export default router
