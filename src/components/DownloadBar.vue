<script setup lang="ts">
import { ref } from 'vue'
import { sendResumeEmail, generateIntroduction } from '@/api'
import { INTRODUCTION_SYSTEM_PROMPT } from '@/prompts/introduction'

const props = defineProps<{
  text: string
  fileName: string
  template?: string
  model?: string
}>()

const isExportingWord = ref(false)
const isExportingPdf = ref(false)
const exportError = ref('')

/* ── 发送到邮箱 ── */
const showEmailDialog = ref(false)
const emailTo = ref('')
const emailSubject = ref('')
const isSendingEmail = ref(false)
const emailSent = ref(false)

/* ── 自我介绍 ── */
const isGeneratingIntro = ref(false)
const introductionText = ref('')
const showIntroDialog = ref(false)
const introError = ref('')

async function generateSelfIntroduction() {
  if (!props.text) return
  isGeneratingIntro.value = true
  introError.value = ''
  introductionText.value = ''

  const res = await generateIntroduction({
    text: props.text,
    model: (props.model as 'glm' | 'deepseek') || 'deepseek',
    systemPrompt: INTRODUCTION_SYSTEM_PROMPT,
  })

  if (res.error) {
    introError.value = res.error
  } else if (res.data) {
    introductionText.value = res.data.text
    showIntroDialog.value = true
  }

  isGeneratingIntro.value = false
}

function closeIntroDialog() {
  showIntroDialog.value = false
  introductionText.value = ''
}

function downloadSelfIntro() {
  const text = introductionText.value
  if (!text) return
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '自我介绍.txt'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── 简历文本结构解析 ── */
const SECTION_HEADINGS = new Set([
  '个人概述', '核心技能', '工作经历', '核心项目', '教育背景', '自我评价',
  '基本信息', '个人简介', '专业技能', '项目经验', '工作经历', '教育经历',
])

interface Chunk {
  type: 'name' | 'section' | 'body'
  text: string
  isBullet: boolean
}

function parseResume(content: string): Chunk[] {
  const lines = content.split('\n').filter(Boolean)
  const chunks: Chunk[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (chunks.length === 0) {
      chunks.push({ type: 'name', text: trimmed, isBullet: false })
    } else if (SECTION_HEADINGS.has(trimmed)) {
      chunks.push({ type: 'section', text: trimmed, isBullet: false })
    } else {
      const isBullet = trimmed.startsWith('●') || trimmed.startsWith('▸') || trimmed.startsWith('•') || trimmed.startsWith('-')
      chunks.push({ type: 'body', text: trimmed, isBullet })
    }
  }
  return chunks
}

/* ── Word 导出 ── */
async function downloadWord() {
  isExportingWord.value = true
  exportError.value = ''
  try {
    const {
      Document, Packer, Paragraph, TextRun,
      AlignmentType, BorderStyle, Table, TableRow, TableCell,
      ShadingType, WidthType, TableBorders,
    } = await import('docx')
    const chunks = parseResume(String(props.text))
    const template = props.template || 'classic-blue'

    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []

    for (const chunk of chunks) {
      if (chunk.type === 'name') {
        if (template === 'modern-business') {
          // 深色顶栏（单格表格模拟背景色）
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: TableBorders.NONE,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.SOLID, color: '1e293b', fill: '1e293b' },
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { before: 200, after: 120 },
                          children: [
                            new TextRun({ text: chunk.text, bold: true, size: 36, font: 'Microsoft YaHei', color: 'ffffff' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          )
        } else if (template === 'fresh-minimal') {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({ text: chunk.text, bold: true, size: 34, font: 'Microsoft YaHei', color: '0F766E' }),
              ],
            }),
          )
        } else {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({ text: chunk.text, bold: true, size: 36, font: 'Microsoft YaHei', color: '1A1A2E' }),
              ],
            }),
          )
        }
        continue
      }

      if (chunk.type === 'section') {
        if (template === 'modern-business') {
          children.push(
            new Paragraph({
              spacing: { before: 200, after: 80 },
              indent: { left: 180 },
              border: { left: { color: '3B82F6', size: 12, space: 6, style: BorderStyle.SINGLE } },
              children: [
                new TextRun({ text: chunk.text, bold: true, size: 22, font: 'Microsoft YaHei', color: '1E293B' }),
              ],
            }),
          )
        } else if (template === 'fresh-minimal') {
          // 用底纹模拟浅色卡片背景
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: TableBorders.NONE,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.SOLID, color: 'F0FDFA', fill: 'F0FDFA' },
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          spacing: { before: 60, after: 60 },
                          indent: { left: 100 },
                          children: [
                            new TextRun({ text: chunk.text, bold: true, size: 22, font: 'Microsoft YaHei', color: '0F766E' }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          )
        } else {
          children.push(
            new Paragraph({
              spacing: { before: 200, after: 80 },
              border: { bottom: { color: '1A5BA0', size: 6, space: 4, style: BorderStyle.SINGLE } },
              children: [
                new TextRun({ text: chunk.text, bold: true, size: 24, font: 'Microsoft YaHei', color: '1A5BA0' }),
              ],
            }),
          )
        }
        continue
      }

      // body
      const isBullet = chunk.isBullet
      if (template === 'modern-business') {
        children.push(
          new Paragraph({
            spacing: { after: 40, line: 260 },
            indent: isBullet ? { left: 720 } : undefined,
            children: [
              new TextRun({ text: chunk.text, size: 18, font: 'Microsoft YaHei', color: '4B5563' }),
            ],
          }),
        )
      } else if (template === 'fresh-minimal') {
        children.push(
          new Paragraph({
            spacing: { after: 50, line: 300 },
            indent: isBullet ? { left: 720 } : undefined,
            children: [
              new TextRun({ text: chunk.text, size: 19, font: 'Microsoft YaHei', color: '374151' }),
            ],
          }),
        )
      } else {
        children.push(
          new Paragraph({
            spacing: { after: 60, line: 276 },
            indent: isBullet ? { left: 720 } : undefined,
            children: [
              new TextRun({ text: chunk.text, size: 19, font: 'Microsoft YaHei' }),
            ],
          }),
        )
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1134,
                right: 1134,
              },
            },
          },
          children,
        },
      ],
    })
    const blob = await Packer.toBlob(doc)
    const name = props.fileName.replace(/\.[^.]+$/, '') + '_优化版.docx'
    downloadBlob(blob, name)
  } catch (e) {
    console.error('[Word导出]', e)
    exportError.value = 'Word 导出失败：' + (e as Error).message
  } finally {
    isExportingWord.value = false
  }
}

/* ── PDF 导出（html2canvas + jspdf） ── */

function buildPdfPreviewEl(content: string, template: string, fontScale: number = 1.0): HTMLDivElement {
  const chunks = parseResume(content)
  const el = document.createElement('div')
  el.style.cssText = 'font-family:"Microsoft YaHei","Noto Sans SC",sans-serif;position:fixed;left:-9999px;top:0;box-sizing:border-box;'

  if (template === 'modern-business') {
    // ── 现代商务 ──
    el.style.cssText += 'width:600px;color:#374151;padding-bottom:60px;'
    const header = document.createElement('div')
    header.style.cssText = 'background:linear-gradient(135deg,#1e293b,#334155);padding:18px 32px 14px;text-align:center;'
    const hName = document.createElement('p')
    hName.style.cssText = 'margin:0;font-size:20pt;font-weight:700;color:#fff;letter-spacing:3px;'
    hName.textContent = chunks.find(c => c.type === 'name')?.text || ''
    header.appendChild(hName)
    el.appendChild(header)

    const body = document.createElement('div')
    body.style.cssText = 'padding:14px 32px 20px;'
    for (const c of chunks) {
      if (c.type === 'name') continue
      if (c.type === 'section') {
        const p = document.createElement('p')
        p.style.cssText = 'margin:12px 0 4px;font-size:11pt;font-weight:700;color:#1e293b;padding-left:10px;border-left:3px solid #3b82f6;'
        p.textContent = c.text
        body.appendChild(p)
      } else {
        const p = document.createElement('p')
        p.style.cssText = `margin:0 0 1px;font-size:9pt;${c.isBullet ? 'padding-left:14px;' : ''}color:#4b5563;line-height:1.6;`
        p.textContent = c.text
        body.appendChild(p)
      }
    }
    el.appendChild(body)

  } else if (template === 'fresh-minimal') {
    // ── 清新简约 ──
    el.style.cssText += 'width:560px;color:#374151;padding:16px 28px 60px;'
    for (const c of chunks) {
      if (c.type === 'name') {
        const p = document.createElement('p')
        p.style.cssText = 'margin:0 0 12px;text-align:center;font-size:17pt;font-weight:700;color:#0f766e;letter-spacing:3px;padding-bottom:6px;border-bottom:2px solid #14b8a6;display:inline-block;width:auto;'
        p.textContent = c.text
        const wrap = document.createElement('div')
        wrap.style.textAlign = 'center'
        wrap.appendChild(p)
        el.appendChild(wrap)
      } else if (c.type === 'section') {
        const wrap = document.createElement('div')
        wrap.style.cssText = 'background:linear-gradient(135deg,#f0fdfa,#ecfdf5);border-radius:6px;padding:4px 12px;margin-top:12px;margin-bottom:4px;'
        const p = document.createElement('p')
        p.style.cssText = 'margin:0;font-size:11pt;font-weight:700;color:#0f766e;'
        p.textContent = c.text
        wrap.appendChild(p)
        el.appendChild(wrap)
      } else {
        const p = document.createElement('p')
        p.style.cssText = `margin:0 0 2px;font-size:9.5pt;${c.isBullet ? 'padding-left:14px;' : ''}line-height:1.65;`
        p.textContent = c.text
        el.appendChild(p)
      }
    }

  } else {
    // ── 经典蓝白（default）──
    el.style.cssText += 'width:560px;padding:16px 28px 60px;color:#333;'
    for (const c of chunks) {
      if (c.type === 'name') {
        const p = document.createElement('p')
        p.style.cssText = 'margin:0 0 6px;text-align:center;font-size:18pt;font-weight:700;color:#1a1a2e;letter-spacing:2px;'
        p.textContent = c.text
        el.appendChild(p)
      } else if (c.type === 'section') {
        const p = document.createElement('p')
        p.style.cssText = 'margin:12px 0 4px;font-size:12pt;font-weight:700;color:#1A5BA0;padding-bottom:2px;border-bottom:2px solid #1A5BA0;'
        p.textContent = c.text
        el.appendChild(p)
      } else {
        const p = document.createElement('p')
        p.style.cssText = `margin:0 0 1px;font-size:9.5pt;${c.isBullet ? 'padding-left:14px;' : ''}line-height:1.6;`
        p.textContent = c.text
        el.appendChild(p)
      }
    }
  }

  // 应用字号缩放（超过 2 页时自动调小）
  if (fontScale < 1.0) {
    const all = el.querySelectorAll<HTMLElement>('[style*="font-size"]')
    for (const node of all) {
      const fs = node.style.fontSize
      if (fs && fs.endsWith('pt')) {
        node.style.fontSize = `${(parseFloat(fs) * fontScale).toFixed(1)}pt`
      }
      // 同步缩放行高
      const lh = node.style.lineHeight
      if (lh && !lh.includes('px') && !lh.includes('pt')) {
        const lhVal = parseFloat(lh)
        if (!isNaN(lhVal)) {
          node.style.lineHeight = `${Math.max(lhVal * (0.4 + 0.6 * fontScale), 1.1)}`
        }
      }
    }
  }

  return el
}

async function downloadPDF() {
  isExportingPdf.value = true
  exportError.value = ''
  try {
    const content = String(props.text)
    if (!content) throw new Error('文本内容为空')

    const { jsPDF } = await import('jspdf')
    const html2canvas = (await import('html2canvas')).default

    const pageW = 210
    const pageH = 297
    const marginTop = 25
    const marginBottom = 25
    const marginLeft = 10
    const marginRight = 10
    const contentW = pageW - marginLeft - marginRight
    const pageViewH = pageH - marginTop - marginBottom

    // 在裁剪边界向上扫描，找到行间空白处（避免文字被裁半）
    function adjustToLineBreak(
      ctx: CanvasRenderingContext2D,
      cw: number,
      cropEndY: number,
      minY: number
    ): number {
      const maxScan = 15
      const start = Math.max(cropEndY - maxScan, minY)
      for (let y = cropEndY - 1; y >= start; y--) {
        const row = ctx.getImageData(0, y, cw, 1).data
        let colored = 0
        for (let x = 0; x < cw; x += 8) {
          const i = x * 4
          if (row[i] < 240 || row[i + 1] < 240 || row[i + 2] < 240) colored++
        }
        if (colored === 0) return y + 1
      }
      return cropEndY
    }

    // 自动缩放：尝试不同字号直至内容 ≤ 2 页
    let bestCanvas: HTMLCanvasElement | null = null
    const scales = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70]

    for (const scale of scales) {
      const el = buildPdfPreviewEl(content, props.template || 'classic-blue', scale)
      document.body.appendChild(el)
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      document.body.removeChild(el)

      bestCanvas = canvas

      const totalPages = Math.ceil(canvas.height / (pageViewH * canvas.width / contentW))
      if (totalPages <= 2) break // 已适配
    }

    const canvas = bestCanvas!
    const pxPerMm = canvas.width / contentW
    const pageViewPx = Math.round(pageViewH * pxPerMm)

    // 生成 PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    let srcY = 0
    let page = 0
    while (srcY < canvas.height) {
      if (page > 0) pdf.addPage()

      let cropEnd = Math.min(srcY + pageViewPx, canvas.height)
      cropEnd = adjustToLineBreak(
        canvas.getContext('2d')!,
        canvas.width,
        cropEnd,
        srcY + Math.round(pageViewPx * 0.6)
      )
      const cropH = cropEnd - srcY

      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = canvas.width
      cropCanvas.height = cropH
      const ctx = cropCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, srcY, canvas.width, cropH, 0, 0, canvas.width, cropH)

      pdf.addImage(cropCanvas, 'PNG', marginLeft, marginTop, contentW, cropH / pxPerMm)

      srcY = cropEnd
      page++
    }

    pdf.save(props.fileName.replace(/\.[^.]+$/, '') + '_优化版.pdf')
  } catch (e) {
    console.error('[PDF导出]', e)
    exportError.value = 'PDF 导出失败：' + (e as Error).message
  } finally {
    isExportingPdf.value = false
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/* ── 发送到邮箱 ── */
function openEmailDialog() {
  emailTo.value = ''
  emailSubject.value = props.fileName.replace(/\.[^.]+$/, '')
  emailSent.value = false
  showEmailDialog.value = true
}

function closeEmailDialog() {
  showEmailDialog.value = false
}

async function doSendEmail() {
  if (!emailTo.value.trim()) return
  isSendingEmail.value = true
  exportError.value = ''

  const res = await sendResumeEmail({
    to: emailTo.value.trim(),
    subject: emailSubject.value.trim(),
    text: props.text,
  })

  if (res.error) {
    exportError.value = res.error
  } else {
    emailSent.value = true
  }

  isSendingEmail.value = false
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-3">
      <button
        class="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        :disabled="isGeneratingIntro || !text"
        @click="generateSelfIntroduction"
      >
        <span v-if="isGeneratingIntro" class="flex items-center justify-center gap-2">
          <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          生成中...
        </span>
        <span v-else>生成自我介绍</span>
      </button>
      <button
        class="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isExportingWord || !text"
        @click="downloadWord"
      >
        {{ isExportingWord ? '导出中...' : '下载 Word' }}
      </button>
      <button
        class="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isExportingPdf || !text"
        @click="downloadPDF"
      >
        {{ isExportingPdf ? '导出中...' : '下载 PDF' }}
      </button>
      <button
        class="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!text"
        @click="openEmailDialog"
      >
        发送到邮箱
      </button>
    </div>
    <p v-if="exportError" class="text-red-500 text-xs text-center">{{ exportError }}</p>

    <!-- 发送到邮箱弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showEmailDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeEmailDialog"
        >
          <div class="fixed inset-0 bg-black/50"></div>
          <div class="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl p-6">
            <!-- 已发送成功 -->
            <template v-if="emailSent">
              <div class="text-center py-6">
                <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">发送成功</h3>
                <p class="text-sm text-gray-500 mb-4">简历已发送到 {{ emailTo }}</p>
                <button
                  class="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  @click="closeEmailDialog"
                >关闭</button>
              </div>
            </template>

            <!-- 输入表单 -->
            <template v-else>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">发送到邮箱</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">主题</label>
                  <input
                    v-model="emailSubject"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="邮件主题"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-600 mb-1">收件人邮箱</label>
                  <input
                    v-model="emailTo"
                    type="email"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="请输入收件人邮箱地址"
                  />
                </div>
              </div>
              <div class="flex gap-3 mt-6">
                <button
                  class="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  @click="closeEmailDialog"
                >取消</button>
                <button
                  class="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isSendingEmail || !emailTo.trim()"
                  @click="doSendEmail"
                >
                  <span v-if="isSendingEmail" class="flex items-center justify-center gap-2">
                    <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    发送中...
                  </span>
                  <span v-else>确认发送</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 自我介绍展示弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showIntroDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeIntroDialog"
        >
          <div class="fixed inset-0 bg-black/50"></div>
          <div class="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800">📋 面试自我介绍</h3>
              <button
                class="text-gray-400 hover:text-gray-600 transition-colors"
                @click="closeIntroDialog"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-6 max-h-[60vh] overflow-y-auto">
              <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                {{ introductionText }}
              </div>
            </div>
            <div class="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                @click="closeIntroDialog"
              >关闭</button>
              <button
                class="flex-1 py-2.5 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors"
                @click="downloadSelfIntro"
              >保存为文本</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
