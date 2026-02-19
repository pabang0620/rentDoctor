import { useState, useCallback, useRef, useEffect } from 'react'
import { chatAPI } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const RISK_LEVEL_KO = {
  '낮음': '낮음',
  '중간': '중간',
  '높음': '높음',
  '매우높음': '매우 높음'
}

/**
 * 진단 결과를 AI에게 전달할 컨텍스트 문자열로 변환
 */
function buildDiagnosisContextString(diagnosis) {
  const level = RISK_LEVEL_KO[diagnosis.riskLevel] || diagnosis.riskLevel
  const lines = [
    `[사용자 위험도 진단 결과]`,
    `위험도: ${level} (${diagnosis.riskScore}점 / 100점)`,
  ]
  if (diagnosis.contractInfo) {
    lines.push(`계약 상태: ${diagnosis.contractInfo.label}`)
  }
  if (diagnosis.mainRisks?.length) {
    lines.push(`주요 위험 요소:`)
    diagnosis.mainRisks.forEach(r => lines.push(`  - ${r}`))
  }
  if (diagnosis.summary) {
    lines.push(`요약: ${diagnosis.summary}`)
  }
  lines.push(`\n위 진단 결과를 참고하여 아래 질문에 답변해 주세요.`)
  return lines.join('\n')
}

/**
 * 채팅 기능 커스텀 훅
 */
export function useChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingMessageRef = useRef('')
  const diagnosisContextRef = useRef(null)
  const isFirstMessageRef = useRef(true)
  const quickStreamIntervalRef = useRef(null)

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (quickStreamIntervalRef.current) {
        clearInterval(quickStreamIntervalRef.current)
      }
    }
  }, [])

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

    // 첫 메시지에 진단 컨텍스트 주입
    let messageToSend = text
    if (diagnosisContextRef.current && isFirstMessageRef.current) {
      isFirstMessageRef.current = false
      const ctx = buildDiagnosisContextString(diagnosisContextRef.current)
      messageToSend = `${ctx}\n\n${text}`
    }

    // 사용자 메시지 추가 (UI엔 원본 텍스트만 표시)
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
      messageToSend,
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
    diagnosisContextRef.current = null
    isFirstMessageRef.current = true
  }, [sessionId])

  /**
   * 초기 웰컴 메시지 (진단 컨텍스트 있으면 맞춤형으로)
   */
  const initializeChat = useCallback(async (diagnosis = null) => {
    diagnosisContextRef.current = diagnosis
    isFirstMessageRef.current = true

    // 로그인 사용자 & 진단 컨텍스트 없을 때: 이전 대화 이력 불러오기
    if (user && !diagnosis) {
      try {
        const history = await chatAPI.getMyHistory()
        if (history && history.messages?.length > 0) {
          const restored = history.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at)
          }))
          setSessionId(history.sessionId)
          setMessages(restored)
          return
        }
      } catch { /* 이력 불러오기 실패 시 기본 웰컴 메시지로 */ }
    }

    let welcomeContent
    if (diagnosis) {
      const level = RISK_LEVEL_KO[diagnosis.riskLevel] || diagnosis.riskLevel
      const contractNote = diagnosis.contractInfo
        ? `\n- **계약 상태:** ${diagnosis.contractInfo.label}`
        : ''
      const risksNote = diagnosis.mainRisks?.length
        ? `\n\n**확인된 위험 요소:**\n${diagnosis.mainRisks.map(r => `- ${r}`).join('\n')}`
        : ''

      welcomeContent = `위험도 진단 결과를 확인했습니다.

- **위험도:** ${level} (${diagnosis.riskScore}점 / 100점)${contractNote}${risksNote}

진단 결과를 바탕으로 궁금한 내용을 질문해 주세요. 임차권등기명령 신청 방법, 내용증명 작성, HUG 보험 청구 절차 등 무엇이든 답변해 드립니다.

---

무료 법률 상담이 필요하시면 **대한법률구조공단 132**로 전화하세요.`
    } else {
      welcomeContent = `안녕하세요. 전세사기 피해 법률 상담 서비스입니다.

처음이라 어디서부터 시작해야 할지 막막하시죠. 지금 어떤 상황인지 편하게 말씀해 주시면 지금 당장 해야 할 일을 단계별로 안내해 드리겠습니다.

**도움 드릴 수 있는 내용:**
- 계약 만료 후 보증금 반환 요구 방법
- 임차권등기명령 신청 방법 (이사 전 반드시 해야 합니다)
- 집주인 연락 두절 시 즉시 대응 방법
- 경매 진행 중 배당 신청으로 보증금 지키기
- HUG 전세보증보험 청구 절차
- 전세사기 특별법 피해자 지원 신청

---

무료 법률 상담이 필요하시면 **대한법률구조공단 132**로 전화하세요.`
    }

    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date()
    }])
  }, [user])

  /**
   * 사전 생성 답변을 AI 스트리밍처럼 순차 출력
   */
  const addQuickAnswer = useCallback((question, answer) => {
    // 기존 스트리밍 중단
    if (quickStreamIntervalRef.current) {
      clearInterval(quickStreamIntervalRef.current)
      quickStreamIntervalRef.current = null
    }

    const now = new Date()
    streamingMessageRef.current = ''

    setMessages(prev => [...prev,
      { id: Date.now(), role: 'user', content: question, timestamp: now },
      { id: Date.now() + 1, role: 'assistant', content: '', timestamp: now, isStreaming: true },
    ])
    setIsLoading(true)
    setIsStreaming(true)

    let i = 0
    const CHUNK = 3   // 한 번에 보낼 글자 수
    const DELAY = 45  // ms 간격 (AI 스트리밍과 비슷한 속도)

    quickStreamIntervalRef.current = setInterval(() => {
      if (i >= answer.length) {
        clearInterval(quickStreamIntervalRef.current)
        quickStreamIntervalRef.current = null
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant' && last.isStreaming) {
            updated[updated.length - 1] = { ...last, isStreaming: false }
          }
          return updated
        })
        setIsLoading(false)
        setIsStreaming(false)
        return
      }

      streamingMessageRef.current += answer.slice(i, Math.min(i + CHUNK, answer.length))
      i += CHUNK
      updateLastMessage(streamingMessageRef.current)
    }, DELAY)
  }, [updateLastMessage])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sessionId,
    sendMessage,
    clearChat,
    initializeChat,
    addQuickAnswer
  }
}

export default useChat
