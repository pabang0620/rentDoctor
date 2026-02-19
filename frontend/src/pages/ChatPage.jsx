import { useEffect, useRef } from 'react'
import ChatInterface from '../components/ChatInterface/ChatInterface.jsx'
import useChat from '../hooks/useChat.js'
import { useAuth } from '../context/AuthContext.jsx'
import './ChatPage.css'

function ChatPage() {
  const { isLoading: authLoading } = useAuth()
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    initializeChat,
    addQuickAnswer
  } = useChat()
  const initialized = useRef(false)

  useEffect(() => {
    // 인증 로딩 완료 후 1회만 초기화 (로그인 상태 확인 후 이력 복원)
    if (authLoading || initialized.current) return
    initialized.current = true

    let diagnosis = null
    const saved = sessionStorage.getItem('diagnosisContext')
    if (saved) {
      try {
        diagnosis = JSON.parse(saved)
      } catch { /* ignore */ }
      sessionStorage.removeItem('diagnosisContext')
    }
    initializeChat(diagnosis)
  }, [authLoading, initializeChat])

  return (
    <div className="chat-page">
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
        onQuickAnswer={addQuickAnswer}
      />
    </div>
  )
}

export default ChatPage
