import { Link } from 'react-router-dom'
import DiagnosticForm from '../components/DiagnosticForm/DiagnosticForm.jsx'
import useDiagnosis from '../hooks/useDiagnosis.js'
import './DiagnosticPage.css'

function DiagnosticPage() {
  const {
    checks,
    contractEndDate,
    setContractEndDate,
    additionalInfo,
    setAdditionalInfo,
    result,
    isLoading,
    error,
    checkedCount,
    toggleCheck,
    runDiagnosis,
    resetDiagnosis
  } = useDiagnosis()

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
              <span className="info-icon">⚠️</span>
              <div>
                <p className="info-title">진단이 어렵다면</p>
                <p className="info-text">
                  <a href="/chat" className="info-link">AI 상담</a>에서 직접 상황을 설명해보세요
                </p>
              </div>
            </div>
            <div className="info-card">
              <span className="info-icon">📞</span>
              <div>
                <p className="info-title">긴급 법률 상담</p>
                <a href="tel:132" className="info-phone">대한법률구조공단 132</a>
              </div>
            </div>
          </div>
        </div>

        <DiagnosticForm
          checks={checks}
          contractEndDate={contractEndDate}
          additionalInfo={additionalInfo}
          result={result}
          isLoading={isLoading}
          error={error}
          checkedCount={checkedCount}
          onToggle={toggleCheck}
          onContractEndDateChange={setContractEndDate}
          onAdditionalInfoChange={setAdditionalInfo}
          onDiagnose={runDiagnosis}
          onReset={resetDiagnosis}
        />

        {result && (
          <div className="diagnostic-page-next">
            <p className="next-text">진단 결과에 대해 더 자세한 설명이 필요하신가요?</p>
            <Link to="/chat" className="next-btn">
              AI 상담사에게 질문하기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosticPage
