import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './ChatInterface.css'

function ChatInterface({ messages, isLoading, isStreaming, error, onSendMessage, onClearChat }) {
  const [inputText, setInputText] = useState('')
  const [openCategory, setOpenCategory] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleQuickQuestion = (question) => {
    onSendMessage(question)
    setOpenCategory(null)
  }

  const QUICK_CATEGORIES = [
    {
      id: 'date',
      label: '📅 계약 만료일 기준',
      questions: [
        '계약 만료일이 지났는데 집주인이 보증금을 안 돌려줍니다. 지금 당장 어떻게 해야 하나요?',
        '계약 만료까지 한 달 남았습니다. 지금부터 준비해야 할 것들을 알려주세요.',
        '계약 만료 전에 임차권등기명령을 신청할 수 있나요? 만료 후에도 가능한가요?',
        '계약이 만료됐는데 집주인이 이사 후에 보증금 준다고 합니다. 이사해도 되나요?',
      ]
    },
    {
      id: 'urgent',
      label: '🚨 긴급 상황',
      questions: [
        '집주인이 연락이 끊겼습니다. 보증금 돌려받을 수 있나요?',
        '경매 통지서를 받았습니다. 배당 신청을 어떻게 해야 하나요?',
        '이미 집을 비워줬는데 보증금을 못 받고 있습니다.',
        '집주인이 보증금 반환을 계속 미루고 있습니다. 강제할 방법이 있나요?',
      ]
    },
    {
      id: 'legal',
      label: '📋 법적 절차',
      questions: [
        '임차권등기명령 신청 방법과 필요한 서류를 알려주세요.',
        'HUG 전세보증보험 청구 절차를 단계별로 알려주세요.',
        '내용증명 보내는 방법과 작성 요령을 알려주세요.',
        '보증금 반환 소송을 직접 제기할 수 있나요? 비용은 얼마나 드나요?',
      ]
    },
    {
      id: 'basic',
      label: '🔍 기본 확인',
      questions: [
        '확정일자와 전입신고를 아직 못 했습니다. 지금 해도 효력이 있나요?',
        '전세사기 피해자 지원 특별법으로 받을 수 있는 혜택이 뭔가요?',
        '등기부등본에서 위험 신호를 어떻게 확인하나요?',
      ]
    }
  ]

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="chat-interface">
      <div className="chat-toolbar">
        <div className="chat-toolbar-info">
          <span className="chat-status-dot"></span>
          <span className="chat-status-text">AI 상담사 연결됨</span>
        </div>
        <button
          className="chat-clear-btn"
          onClick={onClearChat}
          title="대화 초기화"
        >
          새 대화 시작
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message chat-message--${message.role}`}
          >
            {message.role === 'assistant' && (
              <div className="chat-avatar chat-avatar--ai">⚖️</div>
            )}
            <div className="chat-bubble-wrapper">
              <div className={`chat-bubble ${message.isStreaming ? 'chat-bubble--streaming' : ''}`}>
                {message.role === 'assistant' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown>{message.content || ' '}</ReactMarkdown>
                    {message.isStreaming && (
                      <span className="chat-cursor">|</span>
                    )}
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
              <span className="chat-time">{formatTime(message.timestamp)}</span>
            </div>
            {message.role === 'user' && (
              <div className="chat-avatar chat-avatar--user">나</div>
            )}
          </div>
        ))}

        {isLoading && !isStreaming && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-avatar chat-avatar--ai">⚖️</div>
            <div className="chat-bubble-wrapper">
              <div className="chat-bubble">
                <div className="chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <span>오류: {error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="chat-quick-questions">
          <p className="chat-quick-label">상황을 선택하면 바로 질문할 수 있어요</p>
          <div className="chat-quick-categories">
            {QUICK_CATEGORIES.map((category) => (
              <div key={category.id} className="chat-quick-category">
                <button
                  className={`chat-quick-category-btn chat-quick-category-btn--${category.id} ${openCategory === category.id ? 'active' : ''}`}
                  onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                  disabled={isLoading}
                >
                  <span>{category.label}</span>
                  <span className="chat-quick-arrow">{openCategory === category.id ? '▲' : '▼'}</span>
                </button>
                {openCategory === category.id && (
                  <div className="chat-quick-dropdown">
                    {category.questions.map((question, idx) => (
                      <button
                        key={idx}
                        className="chat-quick-item"
                        onClick={() => handleQuickQuestion(question)}
                        disabled={isLoading}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="전세사기 관련 질문을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
            rows={2}
            disabled={isLoading}
            maxLength={2000}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? (
              <span className="chat-send-spinner"></span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="chat-disclaimer">
          ⚠️ AI 상담은 법률 정보 제공 목적입니다. 실제 소송은 <strong>대한법률구조공단(132)</strong>에 문의하세요.
        </p>
      </form>
    </div>
  )
}

export default ChatInterface
