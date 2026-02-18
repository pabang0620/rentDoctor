const BASE_URL = '/api'

/**
 * 네트워크/서버 에러를 사람이 읽기 좋은 메시지로 변환
 */
function toUserMessage(error) {
  const msg = error?.message || ''
  if (
    msg === 'Failed to fetch' ||
    msg.includes('NetworkError') ||
    msg.includes('network') ||
    msg.includes('ECONNREFUSED')
  ) {
    return '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
  }
  return msg || '알 수 없는 오류가 발생했습니다.'
}

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

  let response
  try {
    response = await fetch(url, config)
  } catch (networkErr) {
    throw new Error(toUserMessage(networkErr))
  }

  const text = await response.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`서버 응답을 처리할 수 없습니다. (${response.status})`)
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `오류가 발생했습니다. (${response.status})`)
  }

  return data
}

/**
 * 채팅 API
 */
export const chatAPI = {
  sendMessage: async (message, sessionId = null) => {
    return fetchAPI('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    })
  },

  sendStreamMessage: async (message, sessionId, onChunk, onDone, onError) => {
    let response
    try {
      response = await fetch(`${BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      })
    } catch (networkErr) {
      onError(new Error(toUserMessage(networkErr)))
      return
    }

    if (!response.ok) {
      let errorData = {}
      try {
        const text = await response.text()
        if (text) errorData = JSON.parse(text)
      } catch { /* 무시 */ }
      onError(new Error(errorData.error || `요청에 실패했습니다. (${response.status})`))
      return
    }

    try {
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
              // 개별 라인 파싱 실패 무시
            }
          }
        }
      }
    } catch (streamErr) {
      onError(new Error(toUserMessage(streamErr)))
    }
  },

  getSessionHistory: async (sessionId) => {
    return fetchAPI(`/chat/session/${sessionId}`)
  },

  deleteSession: async (sessionId) => {
    return fetchAPI(`/chat/session/${sessionId}`, { method: 'DELETE' })
  }
}

/**
 * 진단 API
 */
export const diagnosisAPI = {
  diagnose: async (checks, additionalInfo = '', useAI = false, contractEndDate = '') => {
    return fetchAPI('/diagnosis', {
      method: 'POST',
      body: JSON.stringify({ checks, additionalInfo, useAI, contractEndDate })
    })
  },

  getChecklist: async () => {
    return fetchAPI('/diagnosis/checklist')
  }
}

export default { chatAPI, diagnosisAPI }
