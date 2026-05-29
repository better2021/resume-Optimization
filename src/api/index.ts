import type { ApiResponse, OptimizeRequest, OptimizeResult, InterviewAnalyzeRequest, InterviewAnalysisResult, GenerateIntroductionRequest, LocalOptimizeRequest, LocalOptimizeResult } from '@/types'

const API_BASE = '/api'
/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 60000
/** 流式生成请求超时时间（毫秒） */
const STREAM_REQUEST_TIMEOUT = 120000

interface StreamEventPayload {
  token?: string
  error?: string
  success?: boolean
}

interface InterviewStreamHandlers {
  onToken: (token: string) => void
}

/** 读取接口错误响应，避免 500/504 只显示浏览器默认报错 */
async function readErrorResponse(res: Response): Promise<string> {
  try {
    const body = await res.json() as ApiResponse<unknown>
    if (body.error) return body.error
  } catch (e) {
    return `请求失败（${res.status}）`
  }
  return `请求失败（${res.status}）`
}

function parseStreamEvent(chunk: string): { event: string; payload: StreamEventPayload } | null {
  const eventLine = chunk.split('\n').find(line => line.startsWith('event:'))
  const dataLine = chunk.split('\n').find(line => line.startsWith('data:'))
  if (!eventLine || !dataLine) return null

  return {
    event: eventLine.slice(6).trim(),
    payload: JSON.parse(dataLine.slice(5).trim()) as StreamEventPayload,
  }
}

/**
 * 调用云函数优化简历
 * 所有 AI 调用必须通过云函数代理，前端不直接暴露 API Key
 */
export async function optimizeResume(
  params: OptimizeRequest,
): Promise<ApiResponse<OptimizeResult>> {
  try {
    const res = await fetch(`${API_BASE}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/**
 * 调用云函数进行面试分析
 */
export async function analyzeInterview(
  params: InterviewAnalyzeRequest,
): Promise<ApiResponse<InterviewAnalysisResult>> {
  try {
    const res = await fetch(`${API_BASE}/interview-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    if (!res.ok) {
      return { data: null, error: await readErrorResponse(res) }
    }
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/**
 * 流式调用云函数进行面试分析
 */
export async function analyzeInterviewStream(
  params: InterviewAnalyzeRequest,
  handlers: InterviewStreamHandlers,
): Promise<ApiResponse<{ text: string }>> {
  try {
    const res = await fetch(`${API_BASE}/interview-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...params, stream: true }),
      signal: AbortSignal.timeout(STREAM_REQUEST_TIMEOUT),
    })
    if (!res.ok) {
      return { data: null, error: await readErrorResponse(res) }
    }
    if (!res.body) {
      return { data: null, error: '浏览器不支持流式响应' }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''

      for (const chunk of chunks) {
        const parsed = parseStreamEvent(chunk)
        if (!parsed) continue

        if (parsed.event === 'token' && parsed.payload.token) {
          fullText += parsed.payload.token
          handlers.onToken(parsed.payload.token)
        }

        if (parsed.event === 'error') {
          return { data: null, error: parsed.payload.error || 'AI 流式生成失败' }
        }
      }
    }

    return { data: { text: fullText }, error: null }
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/**
 * 调用云函数生成自我介绍
 */
export async function generateIntroduction(
  params: GenerateIntroductionRequest,
): Promise<ApiResponse<{ text: string }>> {
  try {
    const res = await fetch(`${API_BASE}/generate-introduction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/** 发送简历到邮箱 */
export async function sendResumeEmail(params: {
  to: string
  subject: string
  text: string
}): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const res = await fetch(`${API_BASE}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/** 调用云函数进行简历局部优化 */
export async function localOptimize(
  params: LocalOptimizeRequest,
): Promise<ApiResponse<LocalOptimizeResult>> {
  try {
    const res = await fetch(`${API_BASE}/local-optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}

/** 调用云函数解析 .doc 文件 */
export async function parseDocFile(fileBase64: string): Promise<ApiResponse<{ text: string }>> {
  try {
    const res = await fetch(`${API_BASE}/parse-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64 }),
      signal: AbortSignal.timeout(30000),
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '文档解析失败，请确认文件格式正确' }
  }
}
