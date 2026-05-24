<script setup lang="ts">
import { ref } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import type { ParsedResult } from '@/types'

/* PDF.js worker 配置 */
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const emit = defineEmits<{
  (e: 'parsed', result: ParsedResult): void
}>()

const isDragging = ref(false)
const isParsing = ref(false)
const fileName = ref('')
const error = ref('')

/** 解析 PDF 文件为纯文本 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pages.join('\n')
}

/** 解析 Word 文件为纯文本 */
async function parseWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/** 处理上传的文件 */
async function handleFile(file: File) {
  error.value = ''
  fileName.value = file.name

  const isPDF = file.name.endsWith('.pdf')
  const isWord = file.name.endsWith('.docx') || file.name.endsWith('.doc')

  if (!isPDF && !isWord) {
    error.value = '仅支持 PDF 和 Word（.docx / .doc）格式'
    return
  }

  isParsing.value = true
  try {
    const text = isPDF ? await parsePDF(file) : await parseWord(file)
    emit('parsed', {
      text,
      fileName: file.name,
      fileType: isPDF ? 'pdf' : 'docx',
    })
  } catch (e) {
    error.value = '文件解析失败，请确认文件格式正确'
  } finally {
    isParsing.value = false
  }
}

/* 拖拽事件处理 */
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
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

/* 点击上传 */
function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
  input.value = ''
}
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
    :class="[
      isDragging
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
    ]"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="$refs.fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.docx,.doc"
      class="hidden"
      @change="onFileInput"
    />

    <!-- 解析中 -->
    <div v-if="isParsing" class="space-y-3">
      <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-600">正在解析简历文件...</p>
    </div>

    <!-- 已上传 -->
    <div v-else-if="fileName" class="space-y-2">
      <div class="text-4xl">📄</div>
      <p class="text-gray-700 font-medium">{{ fileName }}</p>
      <p class="text-sm text-gray-400">点击重新上传</p>
    </div>

    <!-- 初始状态 -->
    <div v-else class="space-y-2">
      <div class="text-4xl text-gray-300">📁</div>
      <p class="text-gray-600 font-medium">拖拽简历文件到此处，或点击上传</p>
      <p class="text-sm text-gray-400">支持 PDF、Word（.docx / .doc）格式</p>
    </div>

    <!-- 错误提示 -->
    <p v-if="error" class="mt-3 text-red-500 text-sm">{{ error }}</p>
  </div>
</template>
