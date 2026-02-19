import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import DiagnosticPage from './pages/DiagnosticPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/diagnosis" element={<DiagnosticPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
      color: 'var(--color-text-secondary)'
    }}>
      <p style={{ fontSize: '4rem' }}>🔍</p>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p>요청하신 페이지가 존재하지 않습니다.</p>
      <a
        href="/"
        style={{
          padding: '0.625rem 1.25rem',
          background: 'var(--color-primary)',
          color: 'white',
          borderRadius: '8px',
          fontWeight: 600
        }}
      >
        홈으로 이동
      </a>
    </div>
  )
}

export default App
