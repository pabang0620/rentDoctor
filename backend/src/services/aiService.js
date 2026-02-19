import { GoogleGenAI } from '@google/genai'
import { SYSTEM_PROMPT } from '../data/prompts/system-prompt.js'
import { buildRagContext } from './ragService.js'

// 지연 초기화: dotenv 로드 후 첫 호출 시 생성
let _ai = null
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return _ai
}

/**
 * Gemini API 에러를 사용자 친화적 메시지로 변환
 */
function parseGeminiError(err) {
  try {
    const body = JSON.parse(err.message)
    const code = body?.error?.code
    if (code === 429) {
      return new Error('AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.')
    }
    if (code === 400) {
      return new Error('요청이 올바르지 않습니다. 다시 시도해주세요.')
    }
    if (code >= 500) {
      return new Error('AI 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  } catch {
    // err.message가 JSON이 아닌 경우
  }
  if (err.status === 429 || err.code === 429) {
    return new Error('AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.')
  }
  return new Error('AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
}

const MODEL = 'gemma-3-27b-it'

// 할루시네이션 최소화 생성 설정
const GENERATION_CONFIG = {
  temperature: 0.1,
  topP: 0.85,
  topK: 40,
  maxOutputTokens: 2048,
}

const DIAGNOSIS_CONFIG = {
  temperature: 0.0,
  topP: 0.85,
  topK: 40,
  maxOutputTokens: 1024,
}

/**
 * 대화 히스토리 포맷 변환 (role: assistant → model)
 * Gemma는 systemInstruction 미지원 → 시스템 프롬프트를 히스토리 첫 메시지로 삽입
 */
function toGemmaHistory(systemPrompt, messages) {
  return [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: '네, 알겠습니다. 전세사기 피해 법률 상담을 도와드리겠습니다.' }] },
    ...messages.slice(-20).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
  ]
}

/**
 * 일반 채팅 응답 생성
 */
export async function generateChatResponse(messages, userMessage) {
  const ragContext = buildRagContext(userMessage)

  const chat = getAI().chats.create({
    model: MODEL,
    config: GENERATION_CONFIG,
    history: toGemmaHistory(SYSTEM_PROMPT + ragContext, messages),
  })

  try {
    const response = await chat.sendMessage({ message: userMessage })
    return response.text
  } catch (err) {
    throw parseGeminiError(err)
  }
}

/**
 * 스트리밍 채팅 응답 생성 (SSE)
 */
export async function generateStreamingResponse(messages, userMessage, onChunk, onComplete) {
  const ragContext = buildRagContext(userMessage)

  const chat = getAI().chats.create({
    model: MODEL,
    config: GENERATION_CONFIG,
    history: toGemmaHistory(SYSTEM_PROMPT + ragContext, messages),
  })

  try {
    const stream = await chat.sendMessageStream({ message: userMessage })

    let fullText = ''
    for await (const chunk of stream) {
      const text = chunk.text
      if (text) {
        fullText += text
        onChunk(text)
      }
    }

    onComplete(fullText)
  } catch (err) {
    throw parseGeminiError(err)
  }
}

/**
 * 전세사기 진단 분석
 */
export async function analyzeDiagnosis(diagnosisData) {
  const { checks } = diagnosisData

  const checkSummary = Object.entries(checks)
    .map(([key, value]) => `${key}: ${value ? '예' : '아니오'}`)
    .join('\n')

  const prompt = `다음은 전세사기 피해 가능성 진단 체크리스트 결과입니다:

${checkSummary}

위 정보를 바탕으로 분석해주세요.
JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "riskLevel": "낮음|중간|높음|매우높음",
  "riskScore": 0-100,
  "mainRisks": ["위험1", "위험2", "위험3"],
  "immediateActions": ["행동1", "행동2", "행동3", "행동4", "행동5"],
  "supportAgencies": [{"name": "기관명", "phone": "전화번호", "description": "설명"}],
  "summary": "종합 의견 (2-3문장)"
}`

  let response
  try {
    response = await getAI().models.generateContent({
      model: MODEL,
      config: DIAGNOSIS_CONFIG,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: '네, 알겠습니다.' }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    })
  } catch (err) {
    throw parseGeminiError(err)
  }

  const responseText = response.text

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('JSON 파싱 실패:', error)
  }

  return {
    riskLevel: '분석 중',
    riskScore: 50,
    mainRisks: ['전문가 상담 필요'],
    immediateActions: ['대한법률구조공단(132)에 연락하세요'],
    supportAgencies: [{ name: '대한법률구조공단', phone: '132', description: '무료 법률 상담' }],
    summary: responseText.slice(0, 300),
  }
}

export default { generateChatResponse, generateStreamingResponse, analyzeDiagnosis }
