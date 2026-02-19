import { Link } from 'react-router-dom'
import './PolicyPage.css'

function PrivacyPage() {
  return (
    <div className="policy-page">
      <div className="policy-inner">
        <div className="policy-breadcrumb">
          <Link to="/" className="breadcrumb-link">홈</Link>
          <span className="breadcrumb-sep">›</span>
          <span>개인정보처리방침</span>
        </div>

        <h1 className="policy-title">개인정보처리방침</h1>
        <p className="policy-updated">최종 업데이트: 2026년 1월 1일</p>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. 수집하는 개인정보</h2>
            <p>전세닥터(이하 "서비스")는 다음의 개인정보를 수집합니다.</p>
            <ul>
              <li><strong>회원가입 시:</strong> 이메일 주소, 사용자명(닉네임), 비밀번호(암호화 저장)</li>
              <li><strong>서비스 이용 시:</strong> AI와의 대화 내용, 위험도 진단 체크리스트 응답</li>
              <li><strong>자동 수집:</strong> 서버 접속 로그(IP 주소, 접속 시간, 브라우저 정보)</li>
            </ul>
            <p>회원가입 없이 서비스를 이용할 수 있으며, 비회원 이용 시 대화 내용은 서버에 저장되지 않습니다.</p>
          </section>

          <section className="policy-section">
            <h2>2. 개인정보 수집 및 이용 목적</h2>
            <ul>
              <li>전세사기 피해 상담 서비스 제공</li>
              <li>회원 식별 및 로그인 처리</li>
              <li>대화 이력 저장 및 복원 (로그인 회원에 한함)</li>
              <li>서비스 품질 개선 및 이상 접근 탐지</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. 개인정보 보유 및 이용 기간</h2>
            <ul>
              <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 보유, 탈퇴 후 즉시 파기</li>
              <li><strong>대화 이력:</strong> 회원이 '새 대화 시작'을 누르거나 탈퇴 시 파기</li>
              <li><strong>접속 로그:</strong> 3개월간 보유 후 자동 삭제</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. 개인정보 제3자 제공</h2>
            <p>서비스는 수집한 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외입니다.</p>
            <ul>
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. AI 서비스 관련 정보 처리</h2>
            <p>이용자가 입력한 질문 내용은 AI 응답 생성을 위해 Google의 Gemma 모델 API에 전송됩니다. Google의 개인정보처리방침이 함께 적용되며, 이 과정에서 이름·연락처 등 민감한 개인 식별 정보는 입력하지 않도록 권고합니다.</p>
          </section>

          <section className="policy-section">
            <h2>6. 이용자의 권리</h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>본인의 개인정보 열람 요청</li>
              <li>개인정보 정정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>회원 탈퇴를 통한 개인정보 일괄 삭제</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>7. 개인정보 보호를 위한 기술적 조치</h2>
            <ul>
              <li>비밀번호는 단방향 암호화(bcrypt)하여 저장</li>
              <li>API 통신 시 HTTPS 암호화 적용</li>
              <li>JWT 토큰을 통한 인증 관리</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>8. 문의</h2>
            <p>개인정보 처리에 관한 문의는 서비스 내 AI 상담 채널 또는 관련 기관에 문의하시기 바랍니다.</p>
            <p>개인정보 침해 신고는 <strong>개인정보보호위원회(www.pipc.go.kr / 국번없이 182)</strong>에 접수하실 수 있습니다.</p>
          </section>
        </div>

        <div className="policy-footer-nav">
          <Link to="/terms" className="policy-link">이용약관 보기</Link>
          <Link to="/" className="policy-link">홈으로</Link>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
