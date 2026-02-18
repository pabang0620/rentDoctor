import { useMemo, useState, useEffect, useRef } from 'react'
import './DiagnosticForm.css'

/**
 * 계약 만료일 기준 D-Day 계산
 */
function getContractStatus(contractEndDate) {
  if (!contractEndDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(contractEndDate)
  end.setHours(0, 0, 0, 0)
  const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { type: 'expired', days: Math.abs(diffDays), label: `만료됨 (D+${Math.abs(diffDays)}일 경과)`, color: '#dc2626', bg: '#fef2f2' }
  } else if (diffDays === 0) {
    return { type: 'today', days: 0, label: '오늘이 만료일', color: '#dc2626', bg: '#fef2f2' }
  } else if (diffDays <= 30) {
    return { type: 'urgent', days: diffDays, label: `만료 임박 (D-${diffDays}일)`, color: '#d97706', bg: '#fffbeb' }
  } else if (diffDays <= 90) {
    return { type: 'soon', days: diffDays, label: `만료까지 ${diffDays}일`, color: '#2563eb', bg: '#eff6ff' }
  } else {
    return { type: 'safe', days: diffDays, label: `만료까지 ${diffDays}일`, color: '#059669', bg: '#ecfdf5' }
  }
}

const CHECKLIST_ITEMS = [
  {
    key: 'registrationChecked',
    label: '등기부등본 확인',
    description: '계약 전 등기부등본을 열람하여 근저당, 압류, 가처분 등을 확인했다',
    riskType: 'safe',
    hint: null
  },
  {
    key: 'ownerIdentityVerified',
    label: '집주인 신원 확인',
    description: '등기부등본의 소유자와 임대인이 동일인임을 신분증으로 확인했다',
    riskType: 'safe',
    hint: null
  },
  {
    key: 'registrationAndDate',
    label: '전입신고 및 확정일자',
    description: '입주 당일 전입신고를 하고 임대차계약서에 확정일자를 받았다',
    riskType: 'safe',
    hint: null
  },
  {
    key: 'highJeonseRate',
    label: '높은 전세가율 (80% 초과)',
    description: '전세보증금이 주택 시세의 80%를 초과한다',
    riskType: 'danger',
    hint: '경매 낙찰금에서 세금과 근저당을 먼저 갚고 남은 금액을 돌려받는 구조입니다. 전세가율이 높을수록 내 보증금이 돌아올 몫이 줄어들며, 전액 회수가 어려울 수 있습니다.'
  },
  {
    key: 'mortgageExists',
    label: '근저당권 설정',
    description: '등기부등본에 근저당권 또는 담보신탁이 설정되어 있다',
    riskType: 'danger',
    hint: '은행이 먼저 돈을 가져가고 남은 돈에서 내 보증금을 받는 구조입니다. 근저당 금액 + 내 보증금이 시세를 초과하면 전액 돌려받기 어렵습니다.'
  },
  {
    key: 'noHugInsurance',
    label: 'HUG 전세보증보험 미가입',
    description: '주택도시보증공사(HUG) 또는 다른 기관의 전세보증보험에 가입하지 않았다',
    riskType: 'danger',
    hint: '보험이 없으면 집주인이 파산하거나 연락이 끊겼을 때 보증금을 돌려받을 공식 수단이 없습니다. 보험은 집주인 동의 없이도 세입자가 단독으로 가입할 수 있습니다.'
  },
  {
    key: 'taxDelinquency',
    label: '임대인 세금 체납 의심',
    description: '집주인의 세금 납부 여부를 확인했을 때 체납 내역이 있거나 확인이 불가했다',
    riskType: 'danger',
    hint: '집주인의 국세·지방세 체납액은 내 보증금보다 법적으로 먼저 변제됩니다. 세금이 많이 밀려있으면 경매 후 내 몫이 크게 줄어들 수 있습니다.'
  },
  {
    key: 'corporateOwner',
    label: '법인 또는 신탁 소유 주택',
    description: '집주인이 법인이거나 신탁 부동산이다',
    riskType: 'warning',
    hint: '법인 집주인은 개인보다 부도·파산 위험이 높습니다. 신탁 부동산은 실소유 구조가 복잡해서 계약이 잘못되면 보증금 반환이 매우 어려워질 수 있습니다.'
  },
  {
    key: 'multiUnitBuilding',
    label: '다세대/빌라/오피스텔',
    description: '거주하는 주택이 다세대주택, 빌라, 오피스텔이다 (아파트 제외)',
    riskType: 'warning',
    hint: '빌라·다세대는 아파트보다 경매 낙찰가가 낮아 보증금을 전액 회수하지 못하는 경우가 많습니다. 다른 위험 항목이 함께 해당된다면 특히 주의가 필요합니다.'
  },
  {
    key: 'ownerUnreachable',
    label: '임대인 연락 두절 또는 계약 회피',
    description: '집주인이 연락을 받지 않거나, 보증금 반환을 계속 미루고 있다',
    riskType: 'critical',
    hint: '연락 두절은 보증금 반환 의사가 없다는 가장 강한 신호입니다. 이사를 나가면 대항력을 잃어 이후 법적 청구가 더 어려워집니다. 이사 전에 반드시 임차권등기명령을 완료하세요.'
  }
]

const RISK_CONFIG = {
  낮음: { color: '#16a34a', bg: '#f0fdf4', label: '낮음' },
  중간: { color: '#ca8a04', bg: '#fefce8', label: '중간' },
  높음: { color: '#dc2626', bg: '#fef2f2', label: '높음' },
  매우높음: { color: '#991b1b', bg: '#fef2f2', label: '매우 높음' }
}

function DiagnosticForm({ checks, contractEndDate, result, isLoading, error, checkedCount, onToggle, onContractEndDateChange, onDiagnose, onReset }) {

  const contractStatus = useMemo(() => getContractStatus(contractEndDate), [contractEndDate])
  const [expandedHints, setExpandedHints] = useState({})
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const toggleHint = (key, e) => {
    e.preventDefault()
    setExpandedHints(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getRiskType = (key) => {
    const item = CHECKLIST_ITEMS.find(i => i.key === key)
    return item?.riskType || 'safe'
  }

  return (
    <div className="diagnostic-form">
      <div className="diagnostic-header">
        <h2 className="diagnostic-title">위험도 진단</h2>
        <p className="diagnostic-desc">
          해당하는 항목에 체크하여 전세사기 피해 가능성을 진단해보세요.
          <br />
          <strong>초록색</strong>은 안전 조치, <strong>빨간색</strong>은 위험 신호입니다.
        </p>
      </div>

      {/* 계약 만료일 입력 */}
      <div className="contract-date-section">
        <label className="contract-date-label">
          계약 만료일 <span className="contract-date-hint">(입력하면 맞춤 조치를 안내해드려요)</span>
        </label>
        <div className="contract-date-row">
          <input
            type="date"
            className="contract-date-input"
            value={contractEndDate}
            onChange={(e) => onContractEndDateChange(e.target.value)}
          />
          {contractStatus && (
            <div
              className="contract-date-status"
              style={{ backgroundColor: contractStatus.bg, color: contractStatus.color }}
            >
              {contractStatus.label}
            </div>
          )}
        </div>
        {contractStatus?.type === 'expired' && (
          <p className="contract-date-tip expired">계약이 만료된 경우: 지금 바로 <strong>임차권등기명령 신청</strong>이 가능합니다. 이사 전에 반드시 신청하세요.</p>
        )}
        {contractStatus?.type === 'today' && (
          <p className="contract-date-tip expired">오늘이 만료일입니다. 즉시 임차권등기명령 신청을 준비하고 이사 후 대항력 유지 방법을 확인하세요.</p>
        )}
        {contractStatus?.type === 'urgent' && (
          <p className="contract-date-tip urgent">만료 임박: <strong>{contractStatus.days}일</strong> 남았습니다. HUG 보증보험 청구 가능 여부를 지금 확인하세요.</p>
        )}
      </div>

      <div className="checklist-section">
        <div className="checklist-legend">
          <span className="legend-item legend-safe">안전 조치 (갖춘 경우 체크)</span>
          <span className="legend-item legend-danger">위험 신호 (해당하면 체크)</span>
        </div>

        <div className="checklist-grid">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checks[item.key]
            return (
              <label
                key={item.key}
                className={`checklist-item checklist-item--${item.riskType} ${isChecked ? 'checklist-item--checked' : ''}`}
              >
                <input
                  type="checkbox"
                  className="checklist-checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(item.key)}
                />
                <div className="checklist-content">
                  <div className="checklist-top">
                    <span className="checklist-label">{item.label}</span>
                    <span className={`checklist-badge checklist-badge--${item.riskType}`}>
                      {item.riskType === 'safe' ? '안전' :
                       item.riskType === 'warning' ? '주의' :
                       item.riskType === 'danger' ? '위험' : '긴급'}
                    </span>
                  </div>
                  <p className="checklist-desc">{item.description}</p>
                  {item.hint && isChecked && (
                    <div className="checklist-hint-wrapper">
                      <button
                        className={`checklist-hint-chip ${expandedHints[item.key] ? 'active' : ''}`}
                        onClick={(e) => toggleHint(item.key, e)}
                        aria-expanded={!!expandedHints[item.key]}
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <circle cx="8" cy="8" r="7"/>
                          <line x1="8" y1="7.5" x2="8" y2="11"/>
                          <circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none"/>
                        </svg>
                        왜 위험한가요?
                      </button>
                      {expandedHints[item.key] && (
                        <div className={`checklist-hint checklist-hint--${item.riskType}`}>
                          <p className="checklist-hint-text">{item.hint}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div className="diagnostic-actions">
        <button
          className="btn-diagnose"
          onClick={() => onDiagnose(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner"></span>
              진단 중...
            </>
          ) : (
            <>위험도 진단하기</>
          )}
        </button>
        <button
          className="btn-reset"
          onClick={onReset}
          disabled={isLoading}
        >
          초기화
        </button>
      </div>

      {error && (
        <div className="diagnostic-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {result && (
        <div ref={resultRef}>
          <DiagnosticResult result={result} />
        </div>
      )}
    </div>
  )
}

const URGENCY_CONFIG = {
  now:   { label: '지금 바로',    color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  soon:  { label: '빠른 시일 내', color: '#d97706', bg: '#fffbeb', border: '#d97706' },
  check: { label: '확인·검토',   color: '#2563eb', bg: '#eff6ff', border: '#2563eb' }
}

function ActionCard({ action, index }) {
  // 구버전 호환: string으로 온 경우 단순 표시
  if (typeof action === 'string') {
    return (
      <div className="action-card action-card--compat">
        <span className="action-card-num">{index + 1}</span>
        <p className="action-card-title">{action}</p>
      </div>
    )
  }

  const urgency = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.soon

  return (
    <div className="action-card" style={{ borderLeftColor: urgency.border }}>
      <div className="action-card-header">
        <span className="action-card-num">{index + 1}</span>
        <span className="action-card-badge" style={{ color: urgency.color, background: urgency.bg }}>
          {urgency.label}
        </span>
        <h5 className="action-card-title">{action.title}</h5>
      </div>
      <ol className="action-card-steps">
        {action.steps.map((step, j) => (
          <li key={j}>{step}</li>
        ))}
      </ol>
      {action.contact && (
        <a href={`tel:${action.contact.phone}`} className="action-card-contact">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" width="13" height="13">
            <path d="M2 2.5C2 2.5 3.5 1 5 2.5L6.5 4C7 4.5 7 5.5 6.5 6L5.5 7C6 8 7 9.5 9 10.5L10 9.5C10.5 9 11.5 9 12 9.5L13.5 11C15 12.5 13.5 14 13.5 14C13.5 14 4 14 2 4.5C2 3.5 2 2.5 2 2.5Z"/>
          </svg>
          {action.contact.name} {action.contact.phone}
        </a>
      )}
    </div>
  )
}

function DiagnosticResult({ result }) {
  const riskConfig = RISK_CONFIG[result.riskLevel] || RISK_CONFIG['중간']

  return (
    <div className="diagnostic-result">
      {result.contractInfo && (
        <div className={`result-contract-badge result-contract-badge--${result.contractInfo.status}`}>
          {result.contractInfo.label}
        </div>
      )}
      <div
        className="result-header"
        style={{ backgroundColor: riskConfig.bg, borderColor: riskConfig.color }}
      >
        <div className="result-title-group">
          <h3 className="result-title" style={{ color: riskConfig.color }}>
            위험도: {riskConfig.label}
          </h3>
          <div className="result-score-bar">
            <div
              className="result-score-fill"
              style={{ width: `${result.riskScore}%`, backgroundColor: riskConfig.color }}
            />
          </div>
          <p className="result-score-text" style={{ color: riskConfig.color }}>
            위험 점수: {result.riskScore}점 / 100점
          </p>
        </div>
      </div>

      <p className="result-summary">{result.summary}</p>

      {result.mainRisks && result.mainRisks.length > 0 && (
        <div className="result-section">
          <h4 className="result-section-title result-section-title--danger">주요 위험 요소</h4>
          <ul className="result-list result-list--danger">
            {result.mainRisks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {result.immediateActions && result.immediateActions.length > 0 && (
        <div className="result-section">
          <h4 className="result-section-title result-section-title--action">단계별 행동 지침</h4>
          <div className="action-cards-notice">
            ※ 아래 안내는 일반적인 절차를 기준으로 합니다. 비용·처리 기간·가입 조건 등은 법령 개정이나 기관 정책에 따라 변경될 수 있으니, 실제 신청 전 해당 기관에 반드시 확인하세요.
          </div>
          <div className="action-cards">
            {result.immediateActions.map((action, i) => (
              <ActionCard key={i} action={action} index={i} />
            ))}
          </div>
        </div>
      )}

      {result.supportAgencies && result.supportAgencies.length > 0 && (
        <div className="result-section">
          <h4 className="result-section-title result-section-title--contact">연락해야 할 지원 기관</h4>
          <div className="result-agencies">
            {result.supportAgencies.map((agency, i) => (
              <a key={i} href={`tel:${agency.phone}`} className="result-agency">
                <span className="agency-name">{agency.name}</span>
                <span className="agency-phone">☎ {agency.phone}</span>
                <span className="agency-desc">{agency.description}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="result-disclaimer">
        <p>본 진단은 참고용이며 법적 효력이 없습니다. 정확한 판단은 <strong>대한법률구조공단(132)</strong>에 문의하세요.</p>
        <p className="result-disclaimer-note">안내된 비용(인지대·보험료율 등)·가입 조건·연락처는 변경될 수 있습니다. 신청 전 해당 기관에 직접 확인하세요.</p>
      </div>
    </div>
  )
}

export default DiagnosticForm
