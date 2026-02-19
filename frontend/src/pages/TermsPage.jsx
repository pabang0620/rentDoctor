import { Link } from 'react-router-dom'
import './PolicyPage.css'

function TermsPage() {
  return (
    <div className="policy-page">
      <div className="policy-inner">
        <div className="policy-breadcrumb">
          <Link to="/" className="breadcrumb-link">홈</Link>
          <span className="breadcrumb-sep">›</span>
          <span>이용약관</span>
        </div>

        <h1 className="policy-title">이용약관</h1>
        <p className="policy-updated">최종 업데이트: 2026년 1월 1일</p>

        <div className="policy-notice">
          ⚠️ 본 서비스는 <strong>법률 정보 제공을 목적</strong>으로 하며, AI의 응답은 법적 효력이 없습니다. 실제 법률 분쟁에는 반드시 전문 변호사 또는 법률 기관과 상담하시기 바랍니다.
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <h2>제1조 (목적)</h2>
            <p>본 약관은 전세닥터(이하 "서비스")가 제공하는 전세사기 피해 법률 정보 상담 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section className="policy-section">
            <h2>제2조 (서비스의 성격 및 한계)</h2>
            <ol>
              <li>본 서비스는 전세사기 피해 관련 <strong>법률 정보를 안내</strong>하는 서비스입니다. 변호사법에 따른 법률 사무(소송 대리, 법률 자문 등)를 수행하지 않습니다.</li>
              <li>AI가 제공하는 모든 답변은 <strong>일반적인 정보 제공 목적</strong>이며, 개별 사안에 대한 법적 조언이 아닙니다.</li>
              <li>AI 응답의 정확성·완전성·최신성을 보장하지 않으며, 법령 개정이나 판례 변경에 따라 정보가 달라질 수 있습니다.</li>
              <li>이용자는 본 서비스의 정보만을 근거로 중요한 법적 결정을 내리지 않아야 하며, 반드시 공인된 법률 기관(대한법률구조공단 ☎ 132 등)에 확인하시기 바랍니다.</li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>제3조 (이용자의 의무)</h2>
            <ol>
              <li>이용자는 서비스 이용 시 타인의 개인정보를 무단으로 입력하거나 허위 정보를 제공해서는 안 됩니다.</li>
              <li>이용자는 서비스를 이용하여 불법적인 목적으로 활용하거나, 시스템을 교란하는 행위를 해서는 안 됩니다.</li>
              <li>이용자는 AI 응답을 그대로 법적 문서로 사용하거나, 제3자에게 공식 법률 자문으로 제공해서는 안 됩니다.</li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>제4조 (회원 계정)</h2>
            <ol>
              <li>회원가입은 선택 사항이며, 비회원도 서비스를 이용할 수 있습니다.</li>
              <li>회원은 자신의 계정 정보를 안전하게 관리할 책임이 있습니다.</li>
              <li>계정을 타인과 공유하거나, 타인의 계정을 무단 사용해서는 안 됩니다.</li>
              <li>회원 탈퇴 시 저장된 대화 이력을 포함한 모든 개인정보가 삭제됩니다.</li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>제5조 (서비스의 변경 및 중단)</h2>
            <ol>
              <li>서비스는 운영상·기술상의 이유로 사전 공지 없이 서비스 내용을 변경하거나 일시 중단할 수 있습니다.</li>
              <li>AI 모델 성능 변화, API 정책 변경 등으로 인해 응답 품질이 달라질 수 있습니다.</li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>제6조 (면책 조항)</h2>
            <ol>
              <li>서비스는 AI 응답의 정확성에 대해 법적 책임을 지지 않습니다.</li>
              <li>이용자가 AI 응답을 근거로 내린 법적·재정적 결정의 결과에 대해 서비스는 책임을 부담하지 않습니다.</li>
              <li>서비스는 천재지변, 불가항력적 사유, 제3자(API 제공자 등)의 귀책 사유로 인한 장애에 대해 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section className="policy-section">
            <h2>제7조 (약관의 변경)</h2>
            <p>본 약관은 서비스 운영 정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하시기 바랍니다.</p>
          </section>

          <section className="policy-section">
            <h2>긴급 법률 지원 기관</h2>
            <ul>
              <li><strong>대한법률구조공단</strong> ☎ 132 — 무료 법률 상담·소송 지원</li>
              <li><strong>전세사기피해지원센터</strong> ☎ 1588-0001 — 원스톱 피해 지원</li>
              <li><strong>HUG 주택도시보증공사</strong> ☎ 1566-9009 — 전세보증보험 청구</li>
            </ul>
          </section>
        </div>

        <div className="policy-footer-nav">
          <Link to="/privacy" className="policy-link">개인정보처리방침 보기</Link>
          <Link to="/" className="policy-link">홈으로</Link>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
