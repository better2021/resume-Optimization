<script setup lang="ts">
import { ref } from 'vue'
import type { ParsedResult, OptimizeResult, Step, GoalType, ModelType } from '@/types'
import { optimizeResume } from '@/api'
import FileUploader from '@/components/FileUploader.vue'
import ResumeEditor from '@/components/ResumeEditor.vue'
import OptimizeOptions from '@/components/OptimizeOptions.vue'
import DiffPreview from '@/components/DiffPreview.vue'
import DownloadBar from '@/components/DownloadBar.vue'
import InterviewAssistant from '@/components/InterviewAssistant.vue'

/* 页面导航 */
const activeTab = ref<'optimizer' | 'interview'>('optimizer')

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
    <!-- 浮动左侧导航 -->
    <div class="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 gap-1">
      <button
        class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
        :class="activeTab === 'optimizer' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        @click="activeTab = 'optimizer'"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <span>简历优化器</span>
      </button>
      <button
        class="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
        :class="activeTab === 'interview' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        @click="activeTab = 'interview'"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span>面试辅助器</span>
      </button>
    </div>

    <!-- 简历优化器 -->
    <template v-if="activeTab === 'optimizer'">
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
        :model="selectedModel"
      />
    </div>
    </template>

    <!-- 面试辅助器 -->
    <div v-if="activeTab === 'interview'" class="space-y-6">
      <InterviewAssistant />
    </div>
  </div>
</template>
