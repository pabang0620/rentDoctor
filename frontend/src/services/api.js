const BASE_URL = '/api'

/**
 * 공통 fetch 래퍼
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * 채팅 API
 */
export const chatAPI = {
  /**
   * 메시지 전송 (일반 응답)
   */
  sendMessage: async (message, sessionId = null) => {
    return fetchAPI('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    })
  },

  /**
   * 스트리밍 채팅
   * @param {string} message
   * @param {string|null} sessionId
   * @param {Function} onChunk - (text: string) => void
   * @param {Function} onDone - (sessionId: string) => void
   * @param {Function} onError - (error: Error) => void
   */
  sendStreamMessage: async (message, sessionId, onChunk, onDone, onError) => {
    try {
      const response = await fetch(`${BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '스트리밍 요청 실패')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                onChunk(data.text)
              } else if (data.type === 'done') {
                onDone(data.sessionId)
              } else if (data.type === 'error') {
                onError(new Error(data.message))
              }
            } catch {
              // 파싱 실패 무시
            }
          }
        }
      }
    } catch (error) {
      onError(error)
    }
  },

  /**
   * 세션 히스토리 조회
   */
  getSessionHistory: async (sessionId) => {
    return fetchAPI(`/chat/session/${sessionId}`)
  },

  /**
   * 세션 삭제
   */
  deleteSession: async (sessionId) => {
    return fetchAPI(`/chat/session/${sessionId}`, { method: 'DELETE' })
  }
}

/**
 * 진단 API
 */
export const diagnosisAPI = {
  /**
   * 전세사기 피해 진단
   */
  diagnose: async (checks, additionalInfo = '', useAI = false, contractEndDate = '') => {
    return fetchAPI('/diagnosis', {
      method: 'POST',
      body: JSON.stringify({ checks, additionalInfo, useAI, contractEndDate })
    })
  },

  /**
   * 체크리스트 항목 조회
   */
  getChecklist: async () => {
    return fetchAPI('/diagnosis/checklist')
  }
}

/**
 * 법령 정보 API
 */
export const legalAPI = {
  /**
   * 법령 목록 조회
   */
  getLaws: async () => {
    return fetchAPI('/legal/laws')
  },

  /**
   * 법령 상세 조회
   */
  getLawDetail: async (id) => {
    return fetchAPI(`/legal/laws/${id}`)
  },

  /**
   * 사례 목록 조회
   */
  getCases: async () => {
    return fetchAPI('/legal/cases')
  },

  /**
   * FAQ 조회
   */
  getFaq: async () => {
    return fetchAPI('/legal/faq')
  },

  /**
   * 지원 기관 목록
   */
  getSupportAgencies: async () => {
    return fetchAPI('/legal/support-agencies')
  }
}

export default { chatAPI, diagnosisAPI, legalAPI }
