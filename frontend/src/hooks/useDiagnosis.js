import { useState, useCallback } from 'react'
import { diagnosisAPI } from '../services/api.js'

const INITIAL_CHECKS = {
  registrationChecked: false,
  ownerIdentityVerified: false,
  registrationAndDate: false,
  highJeonseRate: false,
  mortgageExists: false,
  noHugInsurance: false,
  taxDelinquency: false,
  corporateOwner: false,
  multiUnitBuilding: false,
  ownerUnreachable: false
}

/**
 * 전세사기 진단 커스텀 훅
 */
export function useDiagnosis() {
  const [checks, setChecks] = useState(INITIAL_CHECKS)
  const [contractEndDate, setContractEndDate] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * 체크박스 토글
   */
  const toggleCheck = useCallback((key) => {
    setChecks(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }, [])

  /**
   * 진단 실행
   */
  const runDiagnosis = useCallback(async (useAI = false) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await diagnosisAPI.diagnose(checks, additionalInfo, useAI, contractEndDate)
      setResult(response.data)
    } catch (err) {
      setError(err.message || '진단 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [checks, additionalInfo, contractEndDate])

  /**
   * 진단 초기화
   */
  const resetDiagnosis = useCallback(() => {
    setChecks(INITIAL_CHECKS)
    setContractEndDate('')
    setAdditionalInfo('')
    setResult(null)
    setError(null)
  }, [])

  /**
   * 체크된 항목 수
   */
  const checkedCount = Object.values(checks).filter(Boolean).length

  return {
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
  }
}

export default useDiagnosis
