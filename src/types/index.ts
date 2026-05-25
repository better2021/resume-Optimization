/** 优化目标类型 */
export type GoalType = 'highlight-achievements' | 'match-jd' | 'concise' | 'highlight-skills' | 'career-pivot' | 'level-up'

/** 优化目标选项 */
export interface OptimizeGoal {
  value: GoalType
  label: string
  description: string
}

/** AI 模型 */
export type ModelType = 'glm' | 'deepseek'

/** 优化结果 */
export interface OptimizeResult {
  optimizedText: string
  score: number
  suggestions: string[]
}

/** API 统一返回格式 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

/** 优化请求参数 */
export interface OptimizeRequest {
  text: string
  goal: GoalType
  jd?: string
  model: ModelType
}

/** 简历解析结果 */
export interface ParsedResult {
  text: string
  fileName: string
  fileType: 'pdf' | 'docx'
}

/** 页面步骤 */
export type Step = 'upload' | 'edit' | 'result'

/** 面试分析 - 面试问题 */
export interface InterviewQuestion {
  question: string
  preparation: string
  example: string
}

/** 面试分析结果 */
export interface InterviewAnalysisResult {
  summary: string
  requirements: string[]
  questions: InterviewQuestion[]
  suggestions: string[]
}

/** 面试分析请求参数 */
export interface InterviewAnalyzeRequest {
  systemPrompt: string
  userPrompt: string
  model: ModelType
}

/** 生成自我介绍请求参数 */
export interface GenerateIntroductionRequest {
  text: string
  model: ModelType
}
