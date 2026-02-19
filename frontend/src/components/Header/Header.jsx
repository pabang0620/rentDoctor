import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import './Header.css'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location])

  const isActive = (path) => location.pathname === path
  const closeMenu = () => setIsMenuOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    closeMenu()
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={closeMenu}>
            <div className="header-logo-mark"></div>
            <span className="header-logo-title">전세지킴이</span>
          </Link>

          <nav className="header-nav">
            <Link to="/" className={`header-nav-link ${isActive('/') ? 'active' : ''}`}>홈</Link>
            <Link to="/chat" className={`header-nav-link ${isActive('/chat') ? 'active' : ''}`}>상담하기</Link>
            <Link to="/diagnosis" className={`header-nav-link ${isActive('/diagnosis') ? 'active' : ''}`}>위험 진단</Link>
          </nav>

          <div className="header-right">
            <a href="tel:132" className="header-contact-link">
              <span className="header-contact-label">법률상담</span>
              <span className="header-contact-num">132</span>
            </a>

            {user ? (
              <div className="header-user">
                <span className="header-username">{user.username}</span>
                <button className="header-logout" onClick={handleLogout}>로그아웃</button>
              </div>
            ) : (
              <Link to="/login" className="header-login-btn">로그인</Link>
            )}

            <button
              className={`header-hamburger ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="메뉴"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="header-mobile-menu">
            <Link to="/" className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`} onClick={closeMenu}>홈</Link>
            <Link to="/chat" className={`mobile-nav-link ${isActive('/chat') ? 'active' : ''}`} onClick={closeMenu}>상담하기</Link>
            <Link to="/diagnosis" className={`mobile-nav-link ${isActive('/diagnosis') ? 'active' : ''}`} onClick={closeMenu}>위험 진단</Link>
            {user ? (
              <div className="mobile-nav-user">
                <span className="mobile-nav-username">{user.username}님</span>
                <button className="mobile-nav-logout" onClick={handleLogout}>로그아웃</button>
              </div>
            ) : (
              <Link to="/login" className="mobile-nav-link" onClick={closeMenu}>로그인</Link>
              <Link to="/register" className="mobile-nav-link" onClick={closeMenu}>회원가입</Link>
            )}
            <div className="mobile-nav-emergency">
              <a href="tel:132" className="mobile-emergency-link">대한법률구조공단 132</a>
              <a href="tel:1533-2020" className="mobile-emergency-link">전세사기피해지원센터 1533-2020</a>
            </div>
          </div>
        )}
      </header>
      {isMenuOpen && <div className="header-overlay" onClick={closeMenu} />}
    </>
  )
}

export default Header
