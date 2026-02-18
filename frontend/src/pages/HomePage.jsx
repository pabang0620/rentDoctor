import { Link, useNavigate } from 'react-router-dom'
import './HomePage.css'

const situationCards = [
  {
    id: 'expiring',
    title: '계약 만료가 다가오는데 보증금 걱정돼요',
    desc: '만료 전 준비할 것, 임차권등기 신청 시기 등을 알려드립니다',
    tag: '만료 임박',
    tagType: 'urgent',
    actionText: '지금 진단하기',
    link: '/diagnosis',
  },
  {
    id: 'unreachable',
    title: '집주인이 연락이 안 됩니다',
    desc: '연락 두절 시 즉시 해야 할 조치, 법적 대응 방법을 알려드립니다',
    tag: '긴급',
    tagType: 'critical',
    actionText: '대응 방법 확인',
    link: '/chat',
  },
  {
    id: 'auction',
    title: '경매 통지서를 받았어요',
    desc: '경매 중 배당 신청, 보증금 회수 방법을 단계별로 안내합니다',
    tag: '즉시 조치 필요',
    tagType: 'critical',
    actionText: '지금 바로 확인',
    link: '/chat',
  },
  {
    id: 'left',
    title: '이사 후에도 보증금을 못 받았어요',
    desc: '이미 이사를 나간 경우 보증금 회수 방법과 소송 절차를 안내합니다',
    tag: '법적 조치 필요',
    tagType: 'danger',
    actionText: '해결 방법 알아보기',
    link: '/chat',
  },
]

const emergencyContacts = [
  { name: '대한법률구조공단', phone: '132' },
  { name: '전세사기피해지원센터', phone: '1533-2020' },
  { name: '주택도시보증공사(HUG)', phone: '1566-9009' },
  { name: '경찰청 민원', phone: '112' },
]

const warningSignals = [
  '전세가율이 시세의 80%를 초과한다',
  '등기부등본에 근저당권이 설정되어 있다',
  '집주인이 신원 확인을 꺼려한다',
  '전입신고 또는 확정일자를 받지 못했다',
  '임대인이 연락을 피하거나 응답이 없다',
  'HUG 전세보증보험에 가입되어 있지 않다',
]

const processSteps = [
  { step: '01', title: '대항력 확보', desc: '전입신고 + 확정일자 취득', timing: '입주 당일 필수' },
  { step: '02', title: '상황 파악', desc: '등기부등본 열람 및 위험 진단', timing: '즉시' },
  { step: '03', title: '임차권등기', desc: '이사 전 법원 신청', timing: '이사 전 반드시' },
  { step: '04', title: '법적 조치', desc: '내용증명 발송 / 소송 제기', timing: '1주일 이내' },
  { step: '05', title: '지원 신청', desc: '특별법 피해자 지원 신청', timing: '조치 후 진행' },
]

const stats = [
  { value: '2.4만', label: '전세사기 피해 접수 건수 (2023)' },
  { value: '3.4조', label: '추정 피해 보증금 규모' },
  { value: '9개', label: '핵심 법령 데이터베이스' },
  { value: '24시간', label: '무료 상담 운영' },
]

function HomePage() {
  return (
    <div className="home-page">
      {/* 히어로 */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">주택임대차보호법 · 전세사기특별법 전문</div>
          <h1 className="hero-title">
            전세사기 피해,
            <br />
            <span className="hero-title-highlight">지금 바로 확인하세요</span>
          </h1>
          <p className="hero-desc">
            처음이라 어떻게 해야 할지 모르셔도 괜찮습니다.
            <br />
            지금 상황을 선택하면 해야 할 일을 단계별로 안내해 드립니다.
          </p>
          <div className="hero-actions">
            <Link to="/diagnosis" className="btn btn-primary btn-lg">
              위험도 진단하기
            </Link>
            <Link to="/chat" className="btn btn-secondary btn-lg">
              법률 상담하기
            </Link>
          </div>
          <p className="hero-disclaimer">
            본 서비스는 법률 정보 제공 목적입니다. 실제 소송은 전문 변호사와 상담하세요.
          </p>
        </div>
      </section>

      {/* 긴급 연락처 배너 */}
      <div className="emergency-banner">
        <div className="emergency-banner-inner">
          <span className="emergency-label">긴급 연락처</span>
          <div className="emergency-contacts">
            {emergencyContacts.map((c) => (
              <a key={c.phone} href={`tel:${c.phone}`} className="emergency-contact">
                <span className="emergency-name">{c.name}</span>
                <span className="emergency-phone">{c.phone}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 상황 선택 */}
      <section className="situation-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">지금 어떤 상황이신가요?</h2>
            <p className="section-subtitle">해당하는 상황을 선택하면 지금 당장 해야 할 일을 알려드립니다</p>
          </div>
          <div className="situation-grid">
            {situationCards.map((card) => (
              <Link key={card.id} to={card.link} className="situation-card">
                <div className="situation-card-top">
                  <span className={`situation-tag situation-tag--${card.tagType}`}>{card.tag}</span>
                </div>
                <h3 className="situation-title">{card.title}</h3>
                <p className="situation-desc">{card.desc}</p>
                <span className="situation-action">{card.actionText} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 위험 신호 */}
      <section className="warning-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">지금 당장 확인하세요</h2>
            <p className="section-subtitle">아래 중 하나라도 해당하면 즉시 전문가 상담이 필요합니다</p>
          </div>
          <div className="warning-grid">
            {warningSignals.map((signal, i) => (
              <div key={i} className="warning-item">
                <span className="warning-text">{signal}</span>
              </div>
            ))}
          </div>
          <div className="warning-cta">
            <Link to="/diagnosis" className="btn btn-primary btn-lg">
              내 상황 위험도 진단하기
            </Link>
          </div>
        </div>
      </section>

      {/* 절차 안내 */}
      <section className="process-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">전세사기 피해 대응 절차</h2>
            <p className="section-subtitle">각 단계별로 언제, 무엇을 해야 하는지 확인하세요</p>
          </div>
          <div className="process-steps">
            {processSteps.map((p) => (
              <div key={p.step} className="process-step">
                <div className="process-step-number">{p.step}</div>
                <div className="process-step-title">{p.title}</div>
                <div className="process-step-desc">{p.desc}</div>
                <div className="process-step-timing">{p.timing}</div>
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
            {stats.map((s) => (
              <div key={s.label} className="stat-item">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">지금 바로 상황을 확인하세요</h2>
          <p className="cta-desc">
            임차권등기, 보증금 반환 청구, 경매 대응 방법을
            <br />
            24시간 무료로 안내합니다.
          </p>
          <div className="hero-actions">
            <Link to="/diagnosis" className="btn btn-cta-primary btn-lg">위험도 진단하기</Link>
            <Link to="/chat" className="btn btn-cta-secondary btn-lg">법률 상담하기</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
