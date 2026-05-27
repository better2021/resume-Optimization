import type { ApiResponse, OptimizeRequest, OptimizeResult, InterviewAnalyzeRequest, InterviewAnalysisResult, GenerateIntroductionRequest, LocalOptimizeRequest, LocalOptimizeResult } from '@/types'

const API_BASE = '/api'
/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 60000

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
    return await res.json()
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
