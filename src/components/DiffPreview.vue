<script setup lang="ts">
import { ref } from 'vue'
import type { OptimizeResult } from '@/types'
import ResumePreviewModal from './ResumePreviewModal.vue'

const props = defineProps<{
  originalText: string
  result: OptimizeResult
  fileName: string
}>()

type ViewMode = 'side-by-side' | 'optimized-only'
const viewMode = ref<ViewMode>('side-by-side')

const toastVisible = ref(false)
const previewVisible = ref(false)

const emit = defineEmits<{
  (e: 'apply', text: string): void
}>()

/* 将优化结果应用到编辑器，显示提示并滚动到顶部 */
function applyOptimized() {
  emit('apply', props.result.optimizedText)
  toastVisible.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 已应用提示 -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg text-sm font-medium"
      >
        已应用 ✓
      </div>
    </Transition>

    <!-- 评分 -->
    <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
      <div class="text-2xl font-bold text-blue-600">{{ result.score }}</div>
      <div class="text-sm text-blue-700">
        <p class="font-medium">简历评分</p>
        <p class="text-xs opacity-75">满分 100 分</p>
      </div>
      <div class="ml-auto flex gap-2">
        <button
          class="px-3 py-1 text-xs rounded-full transition-colors"
          :class="viewMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
          @click="viewMode = 'side-by-side'"
        >分栏对比</button>
        <button
          class="px-3 py-1 text-xs rounded-full transition-colors"
          :class="viewMode === 'optimized-only' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'"
          @click="viewMode = 'optimized-only'"
        >仅看优化后</button>
      </div>
    </div>

    <!-- 优化建议 -->
    <div class="p-4 bg-amber-50 rounded-lg">
      <p class="text-sm font-medium text-amber-800 mb-2">优化建议</p>
      <ul class="space-y-1">
        <li
          v-for="(suggestion, idx) in result.suggestions"
          :key="idx"
          class="text-sm text-amber-700 flex gap-2"
        >
          <span class="text-amber-500 shrink-0">•</span>
          <span>{{ suggestion }}</span>
        </li>
      </ul>
    </div>

    <!-- 对比视图 -->
    <div v-if="viewMode === 'side-by-side'" class="grid grid-cols-2 gap-4">
      <div class="space-y-1">
        <div class="flex justify-between items-center">
          <p class="text-xs font-medium text-gray-500">原始简历</p>
          <span class="text-xs text-gray-400">{{ originalText.length }} 字</span>
        </div>
        <div class="p-4 border border-gray-200 rounded-lg text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 max-h-96 overflow-y-auto">
          {{ originalText }}
        </div>
      </div>
      <div class="space-y-1">
        <div class="flex justify-between items-center">
          <p class="text-xs font-medium text-green-600">优化后简历</p>
          <span class="text-xs text-gray-400">{{ result.optimizedText.length }} 字</span>
        </div>
        <div class="p-4 border border-green-200 rounded-lg text-sm leading-relaxed whitespace-pre-wrap bg-green-50 max-h-96 overflow-y-auto">
          {{ result.optimizedText }}
        </div>
      </div>
    </div>

    <!-- 仅看优化后 -->
    <div v-else class="space-y-1">
      <div class="flex justify-between items-center">
        <p class="text-xs font-medium text-green-600">优化后简历</p>
        <span class="text-xs text-gray-400">{{ result.optimizedText.length }} 字</span>
      </div>
      <div class="p-4 border border-green-200 rounded-lg text-sm leading-relaxed whitespace-pre-wrap bg-green-50 max-h-96 overflow-y-auto">
        {{ result.optimizedText }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex gap-3">
      <button
        class="flex-1 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        @click="applyOptimized"
      >
        将优化结果应用到编辑器继续修改
      </button>
      <button
        class="flex-1 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        @click="previewVisible = true"
      >
        优化后简历预览
      </button>
    </div>

    <!-- 预览弹窗 -->
    <ResumePreviewModal
      :visible="previewVisible"
      :text="result.optimizedText"
      :fileName="fileName"
      @close="previewVisible = false"
    />
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
