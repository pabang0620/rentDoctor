import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import QUICK_ANSWERS from '../../data/quickAnswers.js'
import './ChatInterface.css'

function parseErrorMessage(error) {
  if (!error) return ''
  // 날 JSON 문자열인 경우 파싱 시도
  try {
    const parsed = JSON.parse(error)
    const code = parsed?.error?.code
    if (code === 429) return 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
    if (parsed?.error?.message) return 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  } catch {
    // JSON이 아니면 그대로 사용
  }
  // 너무 길거나 JSON처럼 보이면 대체 메시지
  if (error.length > 200 || error.startsWith('{')) {
    return 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  return error
}

function ChatInterface({ messages, isLoading, isStreaming, isInitializing, isQuickStreaming, error, onSendMessage, onClearChat, onQuickAnswer, onSkipStream }) {
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
    setOpenCategory(null)
    const preAnswer = QUICK_ANSWERS[question]
    if (preAnswer && onQuickAnswer) {
      onQuickAnswer(question, preAnswer)
    } else {
      onSendMessage(question)
    }
  }

  const QUICK_CATEGORIES = [
    {
      id: 'start',
      label: '어디서 시작하죠?',
      desc: '처음이라 막막한 분들을 위한 첫 단계 안내',
      questions: [
        '전세사기 피해를 당한 것 같은데 지금 당장 뭘 해야 하나요?',
        '계약 만료 후 보증금을 못 받고 있습니다. 순서대로 알려주세요.',
        '임차권등기명령을 신청해야 한다고 하는데, 이게 뭔가요?',
        '전세사기 피해자 지원을 신청하려면 어떻게 해야 하나요?',
      ]
    },
    {
      id: 'urgent',
      label: '긴급 상황',
      desc: '지금 당장 조치가 필요한 상황별 대응',
      questions: [
        '집주인이 연락이 끊겼습니다. 지금 당장 어떻게 해야 하나요?',
        '경매 통지서를 받았습니다. 보증금을 지킬 수 있나요?',
        '오늘이 계약 만료일인데 집주인이 보증금을 안 돌려줍니다.',
        '이미 이사를 나왔는데 보증금을 못 받고 있습니다.',
      ]
    },
    {
      id: 'procedure',
      label: '절차 안내',
      desc: '법적 조치 방법과 필요 서류 안내',
      questions: [
        '임차권등기명령 신청 방법과 필요한 서류를 알려주세요.',
        'HUG 전세보증보험 청구 절차를 단계별로 알려주세요.',
        '내용증명 보내는 방법과 작성 요령을 알려주세요.',
        '보증금 반환 소송을 직접 제기할 수 있나요? 비용은 얼마나 드나요?',
      ]
    },
    {
      id: 'terms',
      label: '용어 설명',
      desc: '처음 듣는 법률 용어를 쉽게 설명해드립니다',
      questions: [
        '임차권등기명령이 뭔가요? 신청하면 어떤 효과가 있나요?',
        '확정일자와 전입신고의 차이가 뭔가요? 둘 다 해야 하나요?',
        '대항력이 뭔가요? 내가 대항력을 갖고 있는지 어떻게 확인하나요?',
        'HUG 전세보증보험이 뭔가요? 지금도 가입할 수 있나요?',
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
          <span className="chat-toolbar-title">법률 상담</span>
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
        {isInitializing && (
          <div className="chat-skeleton-wrap">
            <div className="chat-skeleton-msg chat-skeleton-msg--ai">
              <div className="chat-skeleton-avatar" />
              <div className="chat-skeleton-lines">
                <div className="chat-skeleton-line" style={{ width: '70%' }} />
                <div className="chat-skeleton-line" style={{ width: '90%' }} />
                <div className="chat-skeleton-line" style={{ width: '55%' }} />
              </div>
            </div>
            <div className="chat-skeleton-msg chat-skeleton-msg--user">
              <div className="chat-skeleton-lines chat-skeleton-lines--user">
                <div className="chat-skeleton-line" style={{ width: '60%' }} />
              </div>
              <div className="chat-skeleton-avatar" />
            </div>
            <div className="chat-skeleton-msg chat-skeleton-msg--ai">
              <div className="chat-skeleton-avatar" />
              <div className="chat-skeleton-lines">
                <div className="chat-skeleton-line" style={{ width: '80%' }} />
                <div className="chat-skeleton-line" style={{ width: '50%' }} />
              </div>
            </div>
          </div>
        )}
        {!isInitializing && messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message chat-message--${message.role}`}
          >
            {message.role === 'assistant' && (
              <div className="chat-avatar chat-avatar--ai">법</div>
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
            <div className="chat-avatar chat-avatar--ai">법</div>
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
            <span>{parseErrorMessage(error)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isQuickStreaming && (
        <div className="chat-skip-bar">
          <button className="chat-skip-btn" onClick={onSkipStream}>
            ▶▶ 답변 건너뛰기
          </button>
        </div>
      )}

      {messages.length <= 1 && (
        <div className="chat-quick-questions">
          <p className="chat-quick-label">자주 묻는 질문</p>
          <div className="chat-quick-tabs">
            {QUICK_CATEGORIES.map((category) => (
              <button
                key={category.id}
                className={`chat-quick-tab ${openCategory === category.id ? 'active' : ''}`}
                onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                disabled={isLoading}
              >
                {category.label}
              </button>
            ))}
          </div>
          {openCategory && (() => {
            const active = QUICK_CATEGORIES.find(c => c.id === openCategory)
            return (
              <div className="chat-quick-list">
                {active?.desc && (
                  <p className="chat-quick-category-desc">{active.desc}</p>
                )}
                {active?.questions.map((question, idx) => (
                  <button
                    key={idx}
                    className="chat-quick-item"
                    onClick={() => handleQuickQuestion(question)}
                    disabled={isLoading}
                  >
                    <span className="chat-quick-num">{idx + 1}</span>
                    <span className="chat-quick-text">{question}</span>
                    <span className="chat-quick-arrow">→</span>
                  </button>
                ))}
              </div>
            )
          })()}
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
            placeholder="질문을 입력하세요..."
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
          법률 정보 제공 목적입니다. 실제 소송은 <strong>대한법률구조공단(132)</strong>에 문의하세요.
        </p>
      </form>
    </div>
  )
}

export default ChatInterface
