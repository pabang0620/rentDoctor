import { useState, useCallback, useRef } from 'react'
import { chatAPI } from '../services/api.js'

/**
 * 채팅 기능 커스텀 훅
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingMessageRef = useRef('')

  /**
   * 메시지 추가 헬퍼
   */
  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role,
      content,
      timestamp: new Date()
    }])
  }, [])

  /**
   * 스트리밍 메시지 업데이트 헬퍼
   */
  const updateLastMessage = useCallback((content) => {
    setMessages(prev => {
      const updated = [...prev]
      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content
        }
      }
      return updated
    })
  }, [])

  /**
   * 메시지 전송 (스트리밍)
   */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    setError(null)
    setIsLoading(true)

    // 사용자 메시지 추가
    addMessage('user', text)

    // 스트리밍 응답을 위한 빈 AI 메시지 추가
    setIsStreaming(true)
    streamingMessageRef.current = ''
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }])

    await chatAPI.sendStreamMessage(
      text,
      sessionId,
      (chunk) => {
        streamingMessageRef.current += chunk
        updateLastMessage(streamingMessageRef.current)
      },
      (newSessionId) => {
        if (!sessionId) {
          setSessionId(newSessionId)
        }
        // 스트리밍 완료 표시 제거
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              isStreaming: false
            }
          }
          return updated
        })
        setIsStreaming(false)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message || 'AI 응답 생성 중 오류가 발생했습니다.')
        // 오류 시 스트리밍 중인 메시지 제거
        setMessages(prev => prev.filter(m => !m.isStreaming))
        setIsStreaming(false)
        setIsLoading(false)
      }
    )
  }, [isLoading, sessionId, addMessage, updateLastMessage])

  /**
   * 대화 초기화
   */
  const clearChat = useCallback(async () => {
    if (sessionId) {
      try {
        await chatAPI.deleteSession(sessionId)
      } catch {
        // 세션 삭제 실패는 무시
      }
    }
    setMessages([])
    setSessionId(null)
    setError(null)
    streamingMessageRef.current = ''
  }, [sessionId])

  /**
   * 초기 웰컴 메시지
   */
  const initializeChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `안녕하세요. 전세사기 피해 법률 상담 서비스입니다.

처음이라 어디서부터 시작해야 할지 막막하시죠. 지금 어떤 상황인지 편하게 말씀해 주시면 지금 당장 해야 할 일을 단계별로 안내해 드리겠습니다.

**도움 드릴 수 있는 내용:**
- 계약 만료 후 보증금 반환 요구 방법
- 임차권등기명령 신청 방법 (이사 전 반드시 해야 합니다)
- 집주인 연락 두절 시 즉시 대응 방법
- 경매 진행 중 배당 신청으로 보증금 지키기
- HUG 전세보증보험 청구 절차
- 전세사기 특별법 피해자 지원 신청

---

무료 법률 상담이 필요하시면 **대한법률구조공단 132**로 전화하세요.`,
      timestamp: new Date()
    }])
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sessionId,
    sendMessage,
    clearChat,
    initializeChat
  }
}

export default useChat
