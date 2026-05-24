<script setup lang="ts">
import { ref } from 'vue'
import type { ParsedResult, OptimizeResult, Step, GoalType, ModelType } from '@/types'
import { optimizeResume } from '@/api'
import FileUploader from '@/components/FileUploader.vue'
import ResumeEditor from '@/components/ResumeEditor.vue'
import OptimizeOptions from '@/components/OptimizeOptions.vue'
import DiffPreview from '@/components/DiffPreview.vue'
import DownloadBar from '@/components/DownloadBar.vue'

/* 页面状态 */
const currentStep = ref<Step>('upload')
const parsedText = ref('')
const editedText = ref('')
const fileName = ref('')

/* 优化选项 */
const selectedGoal = ref<GoalType>('highlight-achievements')
const jdText = ref('')
const selectedModel = ref<ModelType>('glm')

/* 优化结果 */
const isOptimizing = ref(false)
const result = ref<OptimizeResult | null>(null)
const errorMsg = ref('')

/* 文件解析完成回调 */
function onParsed(parsed: ParsedResult) {
  parsedText.value = parsed.text
  editedText.value = parsed.text
  fileName.value = parsed.fileName
  currentStep.value = 'edit'
  result.value = null
  errorMsg.value = ''
}

/* 应用优化结果到编辑器 */
function applyOptimized(text: string) {
  editedText.value = text
}

/* 执行优化 */
async function doOptimize() {
  if (!editedText.value.trim()) return
  isOptimizing.value = true
  errorMsg.value = ''

  const res = await optimizeResume({
    text: editedText.value,
    goal: selectedGoal.value,
    jd: selectedGoal.value === 'match-jd' ? jdText.value : undefined,
    model: selectedModel.value,
  })

  if (res.error) {
    errorMsg.value = res.error
  } else if (res.data) {
    result.value = res.data
    currentStep.value = 'result'
  }

  isOptimizing.value = false
}

/* 重新上传 */
function reset() {
  currentStep.value = 'upload'
  parsedText.value = ''
  editedText.value = ''
  fileName.value = ''
  result.value = null
  errorMsg.value = ''
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- 标题 -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">简历优化器</h1>
      <p class="mt-2 text-gray-500">上传简历，AI 帮你优化，快速获取面试机会</p>
    </div>

    <!-- 步骤指示器 -->
    <div class="flex justify-center gap-2 mb-8">
      <div
        class="flex items-center gap-2 text-sm"
        :class="currentStep === 'upload' ? 'text-blue-600 font-medium' : 'text-gray-400'"
      >
        <span
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs border"
          :class="currentStep === 'upload' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'"
        >1</span>
        上传简历
      </div>
      <div class="w-8 border-t border-gray-300 mt-3"></div>
      <div
        class="flex items-center gap-2 text-sm"
        :class="currentStep === 'edit' ? 'text-blue-600 font-medium' : 'text-gray-400'"
      >
        <span
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs border"
          :class="currentStep === 'edit' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'"
        >2</span>
        编辑与优化
      </div>
      <div class="w-8 border-t border-gray-300 mt-3"></div>
      <div
        class="flex items-center gap-2 text-sm"
        :class="currentStep === 'result' ? 'text-blue-600 font-medium' : 'text-gray-400'"
      >
        <span
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs border"
          :class="currentStep === 'result' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'"
        >3</span>
        结果与下载
      </div>
    </div>

    <!-- 上传区域 -->
    <FileUploader
      v-if="currentStep === 'upload'"
      @parsed="onParsed"
    />

    <!-- 编辑与优化区域 -->
    <div v-if="currentStep === 'edit' || currentStep === 'result'" class="space-y-6">
      <ResumeEditor v-model="editedText" :fileName="fileName" />

      <OptimizeOptions v-model:goal="selectedGoal" v-model:jd="jdText" />

      <!-- 模型选择 -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">AI 模型</span>
        <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            class="px-4 py-1.5 text-sm rounded-md transition-colors"
            :class="selectedModel === 'glm' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="selectedModel = 'glm'"
          >GLM-4-Flash</button>
          <button
            class="px-4 py-1.5 text-sm rounded-md transition-colors"
            :class="selectedModel === 'deepseek' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="selectedModel = 'deepseek'"
          >DeepSeek</button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3">
        <button
          class="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isOptimizing || !editedText.trim()"
          @click="doOptimize"
        >
          <span v-if="isOptimizing" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            AI 优化中...
          </span>
          <span v-else>优化简历</span>
        </button>
        <button
          class="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          @click="reset"
        >重新上传</button>
      </div>

      <!-- 错误提示 -->
      <p v-if="errorMsg" class="text-red-500 text-sm text-center">{{ errorMsg }}</p>
    </div>

    <!-- 结果区域 -->
    <div v-if="result" class="mt-8 space-y-6">
      <DiffPreview
        :originalText="parsedText"
        :result="result"
        :fileName="fileName"
        @apply="applyOptimized"
      />

      <DownloadBar
        :text="result.optimizedText"
        :fileName="fileName"
      />
    </div>
  </div>
</template>
