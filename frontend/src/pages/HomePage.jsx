import { Link } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const features = [
    {
      icon: '🤖',
      title: 'AI 법률 상담',
      description: 'Claude AI가 전세사기 관련 법률 질문에 24시간 답변합니다. 확정일자, 임차권등기, 경매 대응 등 전문 상담.',
      link: '/chat',
      linkText: '상담 시작하기',
      color: '#e1effe'
    },
    {
      icon: '🔍',
      title: '피해 위험도 진단',
      description: '10가지 핵심 체크리스트로 전세사기 피해 가능성을 진단합니다. 위험도 점수와 맞춤 대응 방법을 제공합니다.',
      link: '/diagnosis',
      linkText: '지금 진단하기',
      color: '#fef3c7'
    },
    {
      icon: '📚',
      title: '법령 정보',
      description: '주택임대차보호법, 전세사기피해자 지원 특별법 등 주요 법령 정보와 판례를 쉽게 이해할 수 있도록 제공합니다.',
      link: '/chat',
      linkText: '법령 질문하기',
      color: '#def7ec'
    }
  ]

  const stats = [
    { value: '2만+', label: '전세사기 피해자 (2023년)' },
    { value: '1조+', label: '전세사기 피해액' },
    { value: '132', label: '법률구조공단 무료상담' },
    { value: '24시간', label: 'AI 상담 가능 시간' }
  ]

  const emergencyContacts = [
    { name: '대한법률구조공단', phone: '132', desc: '무료 법률 상담' },
    { name: '전세사기피해지원센터', phone: '1533-2020', desc: '피해자 지원' },
    { name: 'HUG 주택도시보증공사', phone: '1566-9009', desc: '전세보증보험' },
    { name: '경찰 신고', phone: '112', desc: '긴급/형사 신고' }
  ]

  const warningSignals = [
    '전세가율이 시세의 80%를 초과한다',
    '집주인이 등기부등본 열람을 거부한다',
    '확정일자나 전입신고를 이미 늦게 했다',
    '집주인 연락이 갑자기 안 된다',
    '근저당이 과도하게 설정되어 있다',
    'HUG 보증보험 가입이 거절되었다'
  ]

  return (
    <div className="home-page">
      {/* 히어로 섹션 */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">전세사기 피해자를 위한 서비스</div>
          <h1 className="hero-title">
            전세사기, 혼자 고민하지 마세요
            <br />
            <span className="hero-title-highlight">AI 법률 전문가</span>가 함께합니다
          </h1>
          <p className="hero-desc">
            주택임대차보호법, 전세사기특별법, HUG 전세보증보험 전문 AI가
            <br />
            24시간 무료로 법률 상담을 도와드립니다.
          </p>
          <div className="hero-actions">
            <Link to="/chat" className="btn btn-primary btn-lg">
              AI 상담 시작하기 →
            </Link>
            <Link to="/diagnosis" className="btn btn-secondary btn-lg">
              피해 진단하기
            </Link>
          </div>
          <p className="hero-disclaimer">
            ⚠️ 본 서비스는 법률 정보 제공 목적입니다. 실제 소송은 전문 변호사와 상담하세요.
          </p>
        </div>
      </section>

      {/* 긴급 상황 배너 */}
      <div className="emergency-banner">
        <div className="emergency-banner-inner">
          <span className="emergency-label">🚨 긴급 연락처</span>
          <div className="emergency-contacts">
            {emergencyContacts.map((contact, i) => (
              <a key={i} href={`tel:${contact.phone}`} className="emergency-contact">
                <span className="emergency-name">{contact.name}</span>
                <span className="emergency-phone">{contact.phone}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 주요 기능 */}
      <section className="features">
        <div className="section-inner">
          <h2 className="section-title">주요 서비스</h2>
          <div className="features-grid">
            {features.map((feature, i) => (
              <div
                key={i}
                className="feature-card"
                style={{ '--card-color': feature.color }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
                <Link to={feature.link} className="feature-link">
                  {feature.linkText} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 통계 */}
      <section className="stats-section">
        <div className="section-inner">
          <h2 className="section-title">전세사기 현황</h2>
          <div className="stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="stat-item">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 위험 신호 */}
      <section className="warning-section">
        <div className="section-inner">
          <h2 className="section-title">이런 상황이라면 즉시 확인하세요</h2>
          <div className="warning-grid">
            {warningSignals.map((signal, i) => (
              <div key={i} className="warning-item">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">{signal}</span>
              </div>
            ))}
          </div>
          <div className="warning-cta">
            <Link to="/diagnosis" className="btn btn-danger btn-lg">
              지금 바로 위험도 진단하기
            </Link>
          </div>
        </div>
      </section>

      {/* 절차 안내 */}
      <section className="process-section">
        <div className="section-inner">
          <h2 className="section-title">전세사기 대응 절차</h2>
          <div className="process-steps">
            {[
              { step: '01', title: '대항력 확보', desc: '전입신고 + 확정일자 즉시 취득', icon: '🏠' },
              { step: '02', title: '상황 파악', desc: '등기부등본 확인, 임대인 연락 시도', icon: '🔍' },
              { step: '03', title: '임차권등기', desc: '이사가야 할 경우 대항력 유지', icon: '📝' },
              { step: '04', title: '법적 조치', desc: '내용증명 발송, 소송 또는 신고', icon: '⚖️' },
              { step: '05', title: '지원 신청', desc: '전세사기특별법 피해자 인정 신청', icon: '🤝' }
            ].map((step, i) => (
              <div key={i} className="process-step">
                <div className="process-step-number">{step.step}</div>
                <div className="process-step-icon">{step.icon}</div>
                <h4 className="process-step-title">{step.title}</h4>
                <p className="process-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-inner cta-inner">
          <h2 className="cta-title">지금 바로 AI 상담을 시작하세요</h2>
          <p className="cta-desc">
            24시간 무료로 전세사기 전문 AI 법률 상담을 받을 수 있습니다.
          </p>
          <Link to="/chat" className="btn btn-primary btn-xl">
            무료 AI 상담 시작하기 →
          </Link>
        </div>
      </section>
    </div>
  )
}

export default HomePage
