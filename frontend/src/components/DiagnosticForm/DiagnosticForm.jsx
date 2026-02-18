import { useMemo } from 'react'
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
    icon: '📋',
    riskType: 'safe'
  },
  {
    key: 'ownerIdentityVerified',
    label: '집주인 신원 확인',
    description: '등기부등본의 소유자와 임대인이 동일인임을 신분증으로 확인했다',
    icon: '🪪',
    riskType: 'safe'
  },
  {
    key: 'registrationAndDate',
    label: '전입신고 및 확정일자',
    description: '입주 당일 전입신고를 하고 임대차계약서에 확정일자를 받았다',
    icon: '🏠',
    riskType: 'safe'
  },
  {
    key: 'highJeonseRate',
    label: '높은 전세가율 (80% 초과)',
    description: '전세보증금이 주택 시세의 80%를 초과한다',
    icon: '📊',
    riskType: 'danger'
  },
  {
    key: 'mortgageExists',
    label: '근저당권 설정',
    description: '등기부등본에 근저당권, 담보신탁 등이 설정되어 있다',
    icon: '🏦',
    riskType: 'danger'
  },
  {
    key: 'noHugInsurance',
    label: 'HUG 전세보증보험 미가입',
    description: '주택도시보증공사(HUG) 또는 다른 기관의 전세보증보험에 가입하지 않았다',
    icon: '🛡️',
    riskType: 'danger'
  },
  {
    key: 'taxDelinquency',
    label: '임대인 세금 체납 의심',
    description: '집주인의 세금 납부 여부를 확인했을 때 체납 내역이 있거나 확인이 불가했다',
    icon: '💸',
    riskType: 'danger'
  },
  {
    key: 'corporateOwner',
    label: '법인 또는 신탁 소유 주택',
    description: '집주인이 법인이거나 신탁 부동산이다',
    icon: '🏢',
    riskType: 'warning'
  },
  {
    key: 'multiUnitBuilding',
    label: '다세대/빌라/오피스텔',
    description: '거주하는 주택이 다세대주택, 빌라, 오피스텔이다 (아파트 제외)',
    icon: '🏘️',
    riskType: 'warning'
  },
  {
    key: 'ownerUnreachable',
    label: '임대인 연락 두절 또는 계약 회피',
    description: '집주인이 연락을 받지 않거나, 보증금 반환을 계속 미루고 있다',
    icon: '📵',
    riskType: 'critical'
  }
]

const RISK_CONFIG = {
  낮음: { color: '#057a55', bg: '#def7ec', label: '낮음', icon: '✅' },
  중간: { color: '#d97706', bg: '#fef3c7', label: '중간', icon: '⚠️' },
  높음: { color: '#e02424', bg: '#fde8e8', label: '높음', icon: '🚨' },
  매우높음: { color: '#7c2d12', bg: '#fee2e2', label: '매우 높음', icon: '‼️' }
}

function DiagnosticForm({ checks, contractEndDate, additionalInfo, result, isLoading, error, checkedCount, onToggle, onContractEndDateChange, onAdditionalInfoChange, onDiagnose, onReset }) {

  const contractStatus = useMemo(() => getContractStatus(contractEndDate), [contractEndDate])

  const getRiskType = (key) => {
    const item = CHECKLIST_ITEMS.find(i => i.key === key)
    return item?.riskType || 'safe'
  }

  return (
    <div className="diagnostic-form">
      <div className="diagnostic-header">
        <h2 className="diagnostic-title">전세사기 피해 위험도 진단</h2>
        <p className="diagnostic-desc">
          해당하는 항목에 체크하여 전세사기 피해 가능성을 진단해보세요.
          <br />
          <strong>초록색</strong>은 안전 조치, <strong>빨간색</strong>은 위험 신호입니다.
        </p>
      </div>

      {/* 계약 만료일 입력 */}
      <div className="contract-date-section">
        <label className="contract-date-label">
          📅 계약 만료일 <span className="contract-date-hint">(입력하면 맞춤 조치를 안내해드려요)</span>
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
              {contractStatus.type === 'expired' && '⚠️ '}
              {contractStatus.type === 'today' && '🚨 '}
              {contractStatus.type === 'urgent' && '⏰ '}
              {contractStatus.type === 'soon' && '📋 '}
              {contractStatus.type === 'safe' && '✅ '}
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
                    <span className="checklist-icon">{item.icon}</span>
                    <span className="checklist-label">{item.label}</span>
                    <span className={`checklist-badge checklist-badge--${item.riskType}`}>
                      {item.riskType === 'safe' ? '안전' :
                       item.riskType === 'warning' ? '주의' :
                       item.riskType === 'danger' ? '위험' : '긴급'}
                    </span>
                  </div>
                  <p className="checklist-desc">{item.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <div className="diagnostic-additional">
        <label className="additional-label">추가 상황 설명 (선택)</label>
        <textarea
          className="additional-textarea"
          value={additionalInfo}
          onChange={(e) => onAdditionalInfoChange(e.target.value)}
          placeholder="현재 상황을 자세히 설명해주시면 더 정확한 진단이 가능합니다. (예: 계약 기간 만료일, 경매 진행 여부, 집주인 마지막 연락 시기 등)"
          rows={3}
          maxLength={1000}
        />
        <p className="additional-count">{additionalInfo.length}/1000</p>
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
            <>
              🔍 위험도 진단하기
            </>
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
        <DiagnosticResult result={result} />
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
          📅 {result.contractInfo.label}
        </div>
      )}
      <div
        className="result-header"
        style={{ backgroundColor: riskConfig.bg, borderColor: riskConfig.color }}
      >
        <div className="result-icon">{riskConfig.icon}</div>
        <div className="result-title-group">
          <h3 className="result-title" style={{ color: riskConfig.color }}>
            위험도: {riskConfig.label}
          </h3>
          <div className="result-score-bar">
            <div
              className="result-score-fill"
              style={{
                width: `${result.riskScore}%`,
                backgroundColor: riskConfig.color
              }}
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
          <h4 className="result-section-title">🚨 주요 위험 요소</h4>
          <ul className="result-list result-list--danger">
            {result.mainRisks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {result.immediateActions && result.immediateActions.length > 0 && (
        <div className="result-section">
          <h4 className="result-section-title">✅ 즉시 해야 할 행동</h4>
          <ol className="result-list result-list--action">
            {result.immediateActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </div>
      )}

      {result.supportAgencies && result.supportAgencies.length > 0 && (
        <div className="result-section">
          <h4 className="result-section-title">📞 연락해야 할 지원 기관</h4>
          <div className="result-agencies">
            {result.supportAgencies.map((agency, i) => (
              <a
                key={i}
                href={`tel:${agency.phone}`}
                className="result-agency"
              >
                <span className="agency-name">{agency.name}</span>
                <span className="agency-phone">☎ {agency.phone}</span>
                <span className="agency-desc">{agency.description}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="result-disclaimer">
        ⚠️ 본 진단은 참고용입니다. 정확한 법적 판단을 위해 <strong>대한법률구조공단(132)</strong>에 문의하세요.
      </div>
    </div>
  )
}

export default DiagnosticForm
