import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthPage.css'

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <Link to="/" className="auth-logo">전세지킴이</Link>
        <h1 className="auth-title">회원가입</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">아이디</label>
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="영문·숫자·밑줄, 3~20자"
              maxLength={20}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">비밀번호</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="4~20자"
              maxLength={20}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-bottom">
          <p className="auth-bottom-text">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="auth-bottom-link">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
