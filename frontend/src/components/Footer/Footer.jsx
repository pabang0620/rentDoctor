import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/logo.png" alt="전세닥터" className="footer-logo-img" />
          </div>
          <p className="footer-disclaimer">
            본 서비스는 <strong>법률 정보 제공 목적</strong>으로 운영되며, AI의 응답은 법적 효력이 없습니다.
            실제 법률 분쟁은 반드시 <strong>전문 변호사</strong> 또는 공인된 법률 기관과 상담하시기 바랍니다.
          </p>
        </div>

        <div className="footer-mid">
          <div className="footer-col">
            <p className="footer-col-title">긴급 연락처</p>
            <a href="tel:132" className="footer-emergency-link">대한법률구조공단 ☎ 132</a>
            <a href="tel:1588-0001" className="footer-emergency-link">전세사기피해지원센터 ☎ 1588-0001</a>
            <a href="tel:1566-9009" className="footer-emergency-link">HUG 주택도시보증공사 ☎ 1566-9009</a>
          </div>
          <div className="footer-col">
            <p className="footer-col-title">서비스</p>
            <Link to="/chat" className="footer-nav-link">AI 법률 상담</Link>
            <Link to="/diagnosis" className="footer-nav-link">위험도 진단</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© 2026 전세닥터. All rights reserved.</p>
          <div className="footer-policy-links">
            <Link to="/terms" className="footer-policy-link">이용약관</Link>
            <span className="footer-policy-sep">·</span>
            <Link to="/privacy" className="footer-policy-link">개인정보처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
