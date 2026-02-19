import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { chatAPI } from '../services/api.js'
import './HistoryPage.css'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays < 7) {
    return `${diffDays}일 전`
  }
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    chatAPI.getSessions()
      .then(data => setSessions(data || []))
      .catch(err => showToast(err.message || '대화 이력을 불러오지 못했습니다.', 'error'))
      .finally(() => setIsLoading(false))
  }, [authLoading, user, navigate, showToast])

  const handleSessionClick = (sessionId) => {
    navigate(`/chat?sessionId=${sessionId}`)
  }

  return (
    <div className="history-page">
      <div className="history-inner">
        <div className="history-header">
          <Link to="/mypage" className="history-back">← 내 계정</Link>
          <h1 className="history-title">대화 이력</h1>
        </div>

        {isLoading ? (
          <div className="history-loading">불러오는 중...</div>
        ) : sessions.length === 0 ? (
          <div className="history-empty">
            <p className="history-empty-text">아직 대화 이력이 없습니다.</p>
            <Link to="/chat" className="history-chat-link">상담 시작하기 →</Link>
          </div>
        ) : (
          <ul className="history-list">
            {sessions.map(s => (
              <li key={s.id} className="history-item" onClick={() => handleSessionClick(s.id)}>
                <div className="history-item-content">
                  <p className="history-item-preview">
                    {s.first_message || '(내용 없음)'}
                  </p>
                  <div className="history-item-meta">
                    <span className="history-item-count">
                      메시지 {s.message_count}개
                    </span>
                    <span className="history-item-date">
                      {formatDate(s.updated_at)}
                    </span>
                  </div>
                </div>
                <span className="history-item-arrow">›</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default HistoryPage
