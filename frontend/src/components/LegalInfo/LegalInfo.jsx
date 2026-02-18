import { useState, useEffect } from 'react'
import { legalAPI } from '../../services/api.js'
import './LegalInfo.css'

function LegalInfo() {
  const [agencies, setAgencies] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    legalAPI.getSupportAgencies()
      .then(res => setAgencies(res.data.agencies))
      .catch(() => setAgencies([]))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return <div className="legal-loading">로딩 중...</div>
  }

  return (
    <div className="legal-info">
      <h3 className="legal-info-title">주요 지원 기관</h3>
      <div className="legal-agencies">
        {agencies.map((agency, i) => (
          <a key={i} href={`tel:${agency.phone}`} className="legal-agency">
            <span className="legal-agency-name">{agency.name}</span>
            <span className="legal-agency-phone">{agency.phone}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default LegalInfo
