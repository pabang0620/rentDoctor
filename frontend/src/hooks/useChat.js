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
      content: `안녕하세요! 저는 전세사기 피해 전문 AI 법률 상담 어시스턴트입니다. 🏠

전세사기와 관련된 어떠한 궁금증이라도 편하게 물어보세요. 

**주요 상담 분야:**
- 확정일자, 전입신고, 대항력
- 임차권등기명령 신청 방법
- 경매/공매 시 보증금 회수
- HUG 전세보증보험 청구
- 전세사기 특별법 지원 신청
- 형사 고소 방법

> ⚠️ **안내**: 본 서비스는 법률 정보 제공을 위한 AI 상담입니다. 실제 소송, 경매, 형사고소 등은 반드시 전문 변호사와 상담하시기 바랍니다. 무료 상담: **대한법률구조공단 132**`,
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
