/**
 * 面试辅助器 - JD 内容输入/截图上传 + AI 面试分析
 */
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { ModelType, InterviewAnalysisResult } from '@/types'
import { analyzeInterview } from '@/api'
import { INTERVIEW_SYSTEM_PROMPT, buildInterviewUserPrompt } from '@/prompts/interview'

/** 最大截图上传数量 */
const MAX_IMAGES = 5

const jdText = ref('')
const images = ref<{ file: File; url: string }[]>([])
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/* 模型选择 */
const selectedModel = ref<ModelType>('glm')

/* 分析状态 */
const isLoading = ref(false)
const result = ref<InterviewAnalysisResult | null>(null)
const errorMsg = ref('')
const isDownloading = ref(false)
const resultRef = ref<HTMLElement | null>(null)

const canUploadMore = computed(() => images.value.length < MAX_IMAGES)
const inputReady = computed(() => jdText.value.trim().length > 0 || images.value.length > 0)

/** 处理单张截图上传 */
function handleImageUpload(file: File) {
  if (!file.type.startsWith('image/')) return
  if (images.value.length >= MAX_IMAGES) return
  if (file.size > 10 * 1024 * 1024) return

  const url = URL.createObjectURL(file)
  images.value.push({ file, url })
}

/** 删除已上传截图 */
function removeImage(index: number) {
  const item = images.value.splice(index, 1)[0]
  URL.revokeObjectURL(item.url)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  files.forEach(handleImageUpload)
  input.value = ''
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  files.forEach(handleImageUpload)
}

/** 调用 AI 进行面试分析 */
async function doAnalyze() {
  if (!jdText.value.trim() && images.value.length === 0) {
    errorMsg.value = '请输入 JD 内容或上传 JD 截图'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  result.value = null

  const textToAnalyze = jdText.value.trim() || '(用户上传了 JD 截图但未提供文本，请提示输入文本格式的 JD 以获得完整分析)'
  const systemPrompt = INTERVIEW_SYSTEM_PROMPT
  const userPrompt = buildInterviewUserPrompt(textToAnalyze)

  const res = await analyzeInterview({
    systemPrompt,
    userPrompt,
    model: selectedModel.value,
  })

  if (res.error) {
    errorMsg.value = res.error
  } else if (res.data) {
    result.value = res.data
  }

  isLoading.value = false
}

/** 重新开始 */
function reset() {
  jdText.value = ''
  images.value.forEach(item => URL.revokeObjectURL(item.url))
  images.value = []
  result.value = null
  errorMsg.value = ''
}

/* 构建 Markdown 内容 */
function buildMarkdown(): string {
  const r = result.value
  if (!r) return ''
  let md = '# 面试准备分析\n\n'

  if (r.summary) {
    md += `## JD 核心要点\n${r.summary}\n\n`
  }

  if (r.requirements.length > 0) {
    md += '## 关键岗位要求\n'
    r.requirements.forEach(req => { md += `- ${req}\n` })
    md += '\n'
  }

  if (r.questions.length > 0) {
    md += '## 高概率面试问题\n'
    r.questions.forEach((q, i) => {
      md += `### Q${i + 1}. ${q.question}\n\n`
      md += `**回答思路：** ${q.preparation}\n\n`
      if (q.example) {
        md += `**回答示例：**\n> ${q.example.replace(/\n/g, '\n> ')}\n\n`
      }
    })
  }

  if (r.suggestions.length > 0) {
    md += '## 准备行动清单\n'
    r.suggestions.forEach(sug => { md += `- ${sug}\n` })
    md += '\n'
  }

  return md
}

/** 下载分析结果为 Markdown 文件 */
function downloadMarkdown() {
  const md = buildMarkdown()
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '面试准备分析.md'
  a.click()
  URL.revokeObjectURL(url)
}

/** 下载分析结果为 PNG 图片 */
async function downloadImage() {
  if (!resultRef.value) return
  isDownloading.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(resultRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = '面试准备分析.png'
    a.click()
  } catch (e) {
    console.error('[图片导出]', e)
  } finally {
    isDownloading.value = false
  }
}

/* 组件卸载时释放对象 URL */
onUnmounted(() => {
  images.value.forEach(item => URL.revokeObjectURL(item.url))
})
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="text-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800">面试辅助器</h2>
      <p class="mt-1 text-gray-500">输入职位描述（JD），AI 帮你分析面试方向</p>
    </div>

    <!-- 输入区域 -->
    <div v-if="!result" class="space-y-6">
      <!-- JD 文本输入 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">JD 内容（职位描述及岗位要求）</label>
        <textarea
          v-model="jdText"
          rows="8"
          placeholder="粘贴职位描述（JD）到这里，AI 会根据 JD 分析面试重点..."
          class="w-full p-4 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed"
        ></textarea>
        <p class="text-xs text-gray-400 text-right">{{ jdText.length }} 字</p>
      </div>

      <!-- 分割线 -->
      <div class="flex items-center gap-3">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="text-sm text-gray-400">或</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>

      <!-- 截图上传 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">JD 截图上传</label>
          <span class="text-xs text-gray-400">支持 PNG、JPG、WEBP，最多 5 张</span>
        </div>

        <!-- 上传区域 -->
        <div
          v-if="canUploadMore"
          class="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
          :class="[
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
          ]"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onFileInput"
          />
          <div class="text-3xl text-gray-300 mb-2">🖼️</div>
          <p class="text-sm text-gray-500">
            {{ images.length === 0 ? '点击或拖拽上传 JD 截图' : '继续上传截图' }}
          </p>
          <p v-if="images.length > 0" class="text-xs text-gray-400 mt-1">
            已上传 {{ images.length }}/{{ MAX_IMAGES }} 张
          </p>
        </div>

        <!-- 截图预览网格 -->
        <div v-if="images.length > 0" class="grid grid-cols-5 gap-3">
          <div
            v-for="(img, index) in images"
            :key="index"
            class="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
          >
            <img
              :src="img.url"
              class="w-full h-full object-cover"
              alt="JD 截图"
            />
            <button
              class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
              @click="removeImage(index)"
              title="删除"
            >
              ×
            </button>
            <div class="absolute bottom-0 inset-x-0 text-xs text-white bg-black/50 text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ (img.file.size / 1024 / 1024).toFixed(1) }} MB
            </div>
          </div>
        </div>

        <!-- 已满提示 -->
        <p
          v-if="!canUploadMore"
          class="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2"
        >
          已达到最大上传数量（{{ MAX_IMAGES }} 张），如需更换请先删除已有截图
        </p>
      </div>

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
      <button
        class="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isLoading || !inputReady"
        @click="doAnalyze"
      >
        <span v-if="isLoading" class="flex items-center justify-center gap-2">
          <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          AI 分析中...
        </span>
        <span v-else>生成面试分析</span>
      </button>

      <!-- 错误提示 -->
      <p v-if="errorMsg" class="text-red-500 text-sm text-center">{{ errorMsg }}</p>

      <p class="text-xs text-gray-400 text-center">
        支持输入 JD 文本或上传 JD 截图（或两者同时提供），AI 将综合分析
      </p>
    </div>

    <!-- 分析结果 -->
    <div v-if="result" ref="resultRef" class="space-y-6">
      <!-- 结果头部 -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-800">📋 面试准备分析</h3>
        <button
          class="px-4 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          @click="reset"
        >重新分析</button>
      </div>

      <!-- JD 核心要点 -->
      <div v-if="result.summary" class="p-4 bg-blue-50 rounded-lg">
        <p class="text-sm font-medium text-blue-800 mb-2">JD 核心要点</p>
        <p class="text-sm text-blue-700 leading-relaxed">{{ result.summary }}</p>
      </div>

      <!-- 关键岗位要求 -->
      <div v-if="result.requirements.length > 0" class="space-y-2">
        <p class="text-sm font-medium text-gray-700">🎯 关键岗位要求</p>
        <ul class="space-y-1.5">
          <li
            v-for="(req, idx) in result.requirements"
            :key="idx"
            class="flex gap-2 text-sm text-gray-600"
          >
            <span class="text-blue-500 shrink-0 mt-0.5">•</span>
            <span>{{ req }}</span>
          </li>
        </ul>
      </div>

      <!-- 高概率面试问题 -->
      <div v-if="result.questions.length > 0" class="space-y-3">
        <p class="text-sm font-medium text-gray-700">❓ 高概率面试问题</p>
        <div
          v-for="(item, idx) in result.questions"
          :key="idx"
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p class="text-sm font-medium text-gray-800">
              <span class="text-blue-500">Q{{ idx + 1 }}.</span> {{ item.question }}
            </p>
          </div>
          <div class="px-4 py-3 border-b border-gray-100">
            <p class="text-xs text-gray-400 mb-1">💡 回答思路</p>
            <p class="text-sm text-gray-600 leading-relaxed">{{ item.preparation }}</p>
          </div>
          <div v-if="item.example" class="px-4 py-3">
            <p class="text-xs text-gray-400 mb-1">📝 回答示例</p>
            <div class="text-sm text-gray-700 leading-relaxed bg-green-50 rounded-lg p-3 whitespace-pre-wrap">{{ item.example }}</div>
          </div>
        </div>
      </div>

      <!-- 准备行动清单 -->
      <div v-if="result.suggestions.length > 0" class="space-y-2">
        <p class="text-sm font-medium text-gray-700">💪 准备行动清单</p>
        <ul class="space-y-1.5">
          <li
            v-for="(sug, idx) in result.suggestions"
            :key="idx"
            class="flex gap-2 text-sm text-gray-600"
          >
            <span class="text-green-500 shrink-0 mt-0.5">•</span>
            <span>{{ sug }}</span>
          </li>
        </ul>
      </div>

      <!-- 下载操作 -->
      <div class="flex gap-3 pt-4 border-t border-gray-200">
        <button
          class="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isDownloading"
          @click="downloadMarkdown"
        >下载分析结果 MD 文档</button>
        <button
          class="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isDownloading"
          @click="downloadImage"
        >
          <span v-if="isDownloading" class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            生成中...
          </span>
          <span v-else>下载分析结果图片</span>
        </button>
      </div>
    </div>
  </div>
</template>
