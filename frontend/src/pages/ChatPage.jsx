import { useEffect } from 'react'
import ChatInterface from '../components/ChatInterface/ChatInterface.jsx'
import useChat from '../hooks/useChat.js'
import './ChatPage.css'

function ChatPage() {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    initializeChat
  } = useChat()

  useEffect(() => {
    let diagnosis = null
    const saved = sessionStorage.getItem('diagnosisContext')
    if (saved) {
      try {
        diagnosis = JSON.parse(saved)
      } catch { /* ignore */ }
      sessionStorage.removeItem('diagnosisContext')
    }
    initializeChat(diagnosis)
  }, [])

  return (
    <div className="chat-page">
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        error={error}
        onSendMessage={sendMessage}
        onClearChat={clearChat}
      />
    </div>
  )
}

export default ChatPage
