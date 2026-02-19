import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './AuthPage.css'

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await register(username, password, name, address, gender)
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
        <Link to="/" className="auth-logo">전세닥터</Link>
        <h1 className="auth-title">회원가입</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">이름</label>
            <input
              className="auth-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="실명을 입력해주세요"
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">성별</label>
            <select
              className="auth-input"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              <option value="">선택해주세요</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="auth-field">
            <label className="auth-label">거주지</label>
            <input
              className="auth-input"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="예) 서울시 강남구"
              maxLength={200}
            />
          </div>

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
