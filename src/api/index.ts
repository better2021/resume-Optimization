import type { ApiResponse, OptimizeRequest, OptimizeResult } from '@/types'

const API_BASE = '/api'

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
    })
    return await res.json()
  } catch (e) {
    return { data: null, error: '网络请求失败，请检查连接' }
  }
}
