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
    initializeChat()
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
