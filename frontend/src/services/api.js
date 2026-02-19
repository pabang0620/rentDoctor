const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api'

function getToken() {
  return localStorage.getItem('token')
}

function toUserMessage(error) {
  const msg = error?.message || ''
  if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
    return '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
  }
  return msg || '알 수 없는 오류가 발생했습니다.'
}

async function fetchAPI(endpoint, options = {}) {
  const token = getToken()
  const url = `${BASE_URL}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    try { data = JSON.parse(text) } catch {
      throw new Error(`서버 응답을 처리할 수 없습니다. (${response.status})`)
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `오류가 발생했습니다. (${response.status})`)
  }

  return data
}

/**
 * 인증 API
 */
export const authAPI = {
  register: async (username, password, name, address, gender) => {
    const res = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, name, address, gender })
    })
    return res.data
  },

  login: async (username, password) => {
    const res = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
    return res.data
  },

  me: async () => {
    const res = await fetchAPI('/auth/me')
    return res.data
  },

  deleteAccount: async () => {
    return fetchAPI('/auth/me', { method: 'DELETE' })
  }
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
    const token = getToken()
    let response
    try {
      response = await fetch(`${BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'chunk') onChunk(data.text)
              else if (data.type === 'done') onDone(data.sessionId)
              else if (data.type === 'error') onError(new Error(data.message))
            } catch { /* 개별 라인 파싱 실패 무시 */ }
          }
        }
      }
    } catch (streamErr) {
      onError(new Error(toUserMessage(streamErr)))
    }
  },

  getSessions: async () => {
    const res = await fetchAPI('/chat/sessions')
    return res.data
  },

  getMyHistory: async () => {
    const res = await fetchAPI('/chat/my-history')
    return res.data
  },

  getSessionHistory: async (sessionId) => {
    const res = await fetchAPI(`/chat/history/${sessionId}`)
    return res.data
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
  diagnose: async (checks, contractEndDate = '') => {
    return fetchAPI('/diagnosis', {
      method: 'POST',
      body: JSON.stringify({ checks, contractEndDate })
    })
  },

  getChecklist: async () => {
    return fetchAPI('/diagnosis/checklist')
  }
}

export default { authAPI, chatAPI, diagnosisAPI }
