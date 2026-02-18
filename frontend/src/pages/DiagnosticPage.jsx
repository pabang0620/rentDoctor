import { Link, useNavigate } from 'react-router-dom'
import DiagnosticForm from '../components/DiagnosticForm/DiagnosticForm.jsx'
import useDiagnosis from '../hooks/useDiagnosis.js'
import './DiagnosticPage.css'

function DiagnosticPage() {
  const navigate = useNavigate()
  const {
    checks,
    contractEndDate,
    setContractEndDate,
    result,
    isLoading,
    error,
    checkedCount,
    toggleCheck,
    runDiagnosis,
    resetDiagnosis
  } = useDiagnosis()

  const handleGoToChat = () => {
    if (result) {
      sessionStorage.setItem('diagnosisContext', JSON.stringify(result))
    }
    navigate('/chat')
  }

  return (
    <div className="diagnostic-page">
      <div className="diagnostic-page-inner">
        <div className="diagnostic-page-header">
          <div className="diagnostic-breadcrumb">
            <Link to="/" className="breadcrumb-link">홈</Link>
            <span className="breadcrumb-sep">›</span>
            <span>전세사기 피해 진단</span>
          </div>
          <div className="diagnostic-page-info">
            <div className="info-card">
              <div>
                <p className="info-title">진단이 어렵다면</p>
                <p className="info-text">
                  <a href="/chat" className="info-link">AI 상담</a>에서 직접 상황을 설명해보세요
                </p>
              </div>
            </div>
            <div className="info-card">
              <div>
                <p className="info-title">긴급 법률 상담</p>
                <a href="tel:132" className="info-phone">대한법률구조공단 132</a>
              </div>
            </div>
          </div>
        </div>

        <div className="diagnostic-howto">
          <p className="diagnostic-howto-title">이렇게 사용하세요</p>
          <ol className="diagnostic-howto-steps">
            <li><strong>체크리스트:</strong> 본인 상황에 해당하는 항목을 모두 체크하세요. 모르는 항목은 체크하지 않아도 됩니다.</li>
            <li><strong>계약 만료일:</strong> 입력하면 남은 기간에 맞는 맞춤 행동 지침을 알려드립니다.</li>
            <li><strong>진단하기:</strong> 위험도 점수와 함께 지금 당장 해야 할 일을 순서대로 안내합니다.</li>
          </ol>
        </div>

        <p className="diagnostic-info-note">※ 안내된 비용·가입 조건·연락처는 변경될 수 있습니다. 중요한 사항은 반드시 해당 기관에 직접 확인하세요.</p>

        <DiagnosticForm
          checks={checks}
          contractEndDate={contractEndDate}
          result={result}
          isLoading={isLoading}
          error={error}
          checkedCount={checkedCount}
          onToggle={toggleCheck}
          onContractEndDateChange={setContractEndDate}
          onDiagnose={runDiagnosis}
          onReset={resetDiagnosis}
        />

        {result && (
          <div className="diagnostic-page-next">
            <p className="next-text">진단 결과에 대해 더 자세한 설명이 필요하신가요?</p>
            <button className="next-btn" onClick={handleGoToChat}>
              추가 상담하기 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosticPage
