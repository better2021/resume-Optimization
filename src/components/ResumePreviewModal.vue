<script setup lang="ts">
import { ref, computed } from 'vue'
import DownloadBar from './DownloadBar.vue'

const props = defineProps<{
  visible: boolean
  text: string
  fileName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

/* ── 模版选择 ── */
type TemplateId = 'classic-blue' | 'modern-business' | 'fresh-minimal'
const activeTemplate = ref<TemplateId>('classic-blue')

const templates: { id: TemplateId; label: string }[] = [
  { id: 'classic-blue', label: '经典蓝白' },
  { id: 'modern-business', label: '现代商务' },
  { id: 'fresh-minimal', label: '清新简约' },
]

/* ── 简历文本结构解析 ── */
const SECTION_HEADINGS = new Set([
  '个人概述', '核心技能', '工作经历', '核心项目', '教育背景', '自我评价',
  '基本信息', '个人简介', '专业技能', '项目经验', '教育经历',
  '个人总结', '职业技能', '工作经历',
])

interface Chunk {
  type: 'name' | 'section' | 'body'
  text: string
  isBullet: boolean
}

const chunks = computed<Chunk[]>(() => {
  const lines = props.text.split('\n').filter(Boolean)
  const result: Chunk[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (result.length === 0) {
      result.push({ type: 'name', text: trimmed, isBullet: false })
    } else if (SECTION_HEADINGS.has(trimmed)) {
      result.push({ type: 'section', text: trimmed, isBullet: false })
    } else {
      const isBullet = trimmed.startsWith('●') || trimmed.startsWith('▸') || trimmed.startsWith('•') || trimmed.startsWith('-')
      result.push({ type: 'body', text: trimmed, isBullet })
    }
  }
  return result
})

/* ── 弹窗交互 ── */
function onClose() { emit('close') }

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-backdrop')) onClose()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') onClose()
}

import { onMounted, onUnmounted } from 'vue'
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="modal">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      @click="onBackdropClick"
    >
      <div class="fixed inset-0 bg-black/50"></div>

      <div class="relative z-10 w-full max-w-4xl max-h-[92vh] mx-4 bg-white rounded-xl shadow-2xl flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-semibold text-gray-800">优化后简历预览</h3>
            <div class="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                v-for="tpl in templates"
                :key="tpl.id"
                class="px-3 py-1.5 text-xs rounded-md transition-colors"
                :class="activeTemplate === tpl.id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
                @click="activeTemplate = tpl.id"
              >{{ tpl.label }}</button>
            </div>
          </div>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="onClose"
            title="关闭"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 预览内容 -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <!-- ===== 经典蓝白 ===== -->
          <div v-if="activeTemplate === 'classic-blue'" class="tpl-classic-blue">
            <div class="resume-paper">
              <div v-for="(chunk, i) in chunks" :key="i">
                <h1 v-if="chunk.type === 'name'" class="name">{{ chunk.text }}</h1>
                <h2 v-else-if="chunk.type === 'section'" class="section">{{ chunk.text }}</h2>
                <p v-else class="body" :class="{ bullet: chunk.isBullet }">{{ chunk.text }}</p>
              </div>
            </div>
          </div>

          <!-- ===== 现代商务 ===== -->
          <div v-if="activeTemplate === 'modern-business'" class="tpl-modern-business">
            <div class="resume-paper">
              <div class="header-strip">
                <div v-for="(chunk, i) in chunks.filter(c => c.type === 'name')" :key="i">
                  <h1 class="name">{{ chunk.text }}</h1>
                </div>
                <div class="contact-placeholder">电话 | 邮箱</div>
              </div>
              <div class="content-area">
                <div v-for="(chunk, i) in chunks.filter(c => c.type !== 'name')" :key="i">
                  <h2 v-if="chunk.type === 'section'" class="section">{{ chunk.text }}</h2>
                  <p v-else class="body" :class="{ bullet: chunk.isBullet }">{{ chunk.text }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== 清新简约 ===== -->
          <div v-if="activeTemplate === 'fresh-minimal'" class="tpl-fresh-minimal">
            <div class="resume-paper">
              <div v-for="(chunk, i) in chunks" :key="i">
                <div v-if="chunk.type === 'name'" class="name-block">
                  <h1 class="name">{{ chunk.text }}</h1>
                </div>
                <div v-else-if="chunk.type === 'section'" class="section-card">
                  <h2 class="section">{{ chunk.text }}</h2>
                </div>
                <p v-else class="body" :class="{ bullet: chunk.isBullet }">{{ chunk.text }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部下载按钮 -->
        <div class="px-6 py-4 border-t border-gray-200 shrink-0">
          <DownloadBar :text="text" :fileName="fileName" :template="activeTemplate" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── 弹窗动画 ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95); }
.modal-leave-to > div:last-child { transform: scale(0.95); }

/* ── 共用预览纸张 ── */
.resume-paper {
  max-width: 620px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  font-family: 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}
.resume-paper h1,
.resume-paper h2,
.resume-paper p {
  margin: 0;
}

/* ════════════════════════════════════════
   模版 A：经典蓝白
   ════════════════════════════════════════ */
.tpl-classic-blue .resume-paper {
  padding: 42px 48px;
}
.tpl-classic-blue .name {
  text-align: center;
  font-size: 18pt;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
  letter-spacing: 2px;
}
.tpl-classic-blue .section {
  font-size: 12pt;
  font-weight: 700;
  color: #1A5BA0;
  margin-top: 14px;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 2px solid #1A5BA0;
}
.tpl-classic-blue .body {
  font-size: 9.5pt;
  color: #333;
  line-height: 1.6;
  margin-bottom: 2px;
}
.tpl-classic-blue .body.bullet {
  padding-left: 14px;
}

/* ════════════════════════════════════════
   模版 B：现代商务
   ════════════════════════════════════════ */
.tpl-modern-business .resume-paper {
  overflow: hidden;
}
.tpl-modern-business .header-strip {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 32px 48px 24px;
  text-align: center;
}
.tpl-modern-business .header-strip .name {
  font-size: 20pt;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3px;
  margin-bottom: 2px;
}
.tpl-modern-business .header-strip .contact-placeholder {
  font-size: 8.5pt;
  color: rgba(255,255,255,0.5);
  margin-top: 4px;
}
.tpl-modern-business .content-area {
  padding: 24px 48px 36px;
}
.tpl-modern-business .section {
  font-size: 11pt;
  font-weight: 700;
  color: #1e293b;
  margin-top: 16px;
  margin-bottom: 6px;
  padding-left: 10px;
  border-left: 3px solid #3b82f6;
  line-height: 1.4;
}
.tpl-modern-business .body {
  font-size: 9pt;
  color: #374151;
  line-height: 1.65;
  margin-bottom: 2px;
}
.tpl-modern-business .body.bullet {
  padding-left: 14px;
  color: #4b5563;
}

/* ════════════════════════════════════════
   模版 C：清新简约
   ════════════════════════════════════════ */
.tpl-fresh-minimal .resume-paper {
  padding: 36px 44px;
}
.tpl-fresh-minimal .name-block {
  text-align: center;
  margin-bottom: 16px;
}
.tpl-fresh-minimal .name {
  display: inline-block;
  font-size: 17pt;
  font-weight: 700;
  color: #0f766e;
  letter-spacing: 3px;
  padding-bottom: 6px;
  border-bottom: 2px solid #14b8a6;
}
.tpl-fresh-minimal .section-card {
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%);
  border-radius: 6px;
  padding: 5px 14px;
  margin-top: 14px;
  margin-bottom: 6px;
}
.tpl-fresh-minimal .section {
  font-size: 11pt;
  font-weight: 700;
  color: #0f766e;
}
.tpl-fresh-minimal .body {
  font-size: 9.5pt;
  color: #374151;
  line-height: 1.7;
  margin-bottom: 3px;
}
.tpl-fresh-minimal .body.bullet {
  padding-left: 14px;
}
</style>
