import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { authAPI } from '../services/api.js'
import './MyPage.css'

function MyPage() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const leavingRef = useRef(false)

  useEffect(() => {
    if (!authLoading && !user && !leavingRef.current) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  if (authLoading || !user) return null

  const handleLogout = () => {
    leavingRef.current = true
    logout()
    showToast('로그아웃 되었습니다.', 'info')
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await authAPI.deleteAccount()
      leavingRef.current = true
      logout()
      showToast('회원 탈퇴가 완료되었습니다.', 'success')
      navigate('/')
    } catch (err) {
      showToast(err.message || '탈퇴에 실패했습니다.', 'error')
      setShowConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const GENDER_LABELS = { '남성': '남성', '여성': '여성', '기타': '기타' }

  return (
    <div className="mypage">
      <div className="mypage-inner">
        <div className="mypage-header">
          <h1 className="mypage-title">내 계정</h1>
          <Link to="/history" className="mypage-history-link">대화 이력 보기 →</Link>
        </div>

        <div className="mypage-card">
          <div className="mypage-row">
            <span className="mypage-label">이름</span>
            <span className="mypage-value">{user.name || '—'}</span>
          </div>
          <div className="mypage-row">
            <span className="mypage-label">아이디</span>
            <span className="mypage-value">{user.username}</span>
          </div>
          <div className="mypage-row">
            <span className="mypage-label">성별</span>
            <span className="mypage-value">{GENDER_LABELS[user.gender] || '—'}</span>
          </div>
          <div className="mypage-row">
            <span className="mypage-label">거주지</span>
            <span className="mypage-value">{user.address || '—'}</span>
          </div>
        </div>

        <div className="mypage-actions">
          <button className="mypage-logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
          <button className="mypage-delete-btn" onClick={() => setShowConfirm(true)}>
            회원 탈퇴
          </button>
        </div>

        {showConfirm && (
          <div className="mypage-confirm-overlay" onClick={() => !isDeleting && setShowConfirm(false)}>
            <div className="mypage-confirm-box" onClick={e => e.stopPropagation()}>
              <h2 className="mypage-confirm-title">정말 탈퇴하시겠습니까?</h2>
              <p className="mypage-confirm-desc">
                탈퇴 시 모든 대화 이력과 계정 정보가 영구적으로 삭제됩니다.<br />
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="mypage-confirm-btns">
                <button
                  className="mypage-confirm-cancel"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  className="mypage-confirm-ok"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? '처리 중...' : '탈퇴 확인'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyPage
