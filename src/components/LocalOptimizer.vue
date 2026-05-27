<script setup lang="ts">
import { ref } from 'vue'
import type { ModelType } from '@/types'
import { localOptimize } from '@/api'

const resumeText = ref('')
const requirement = ref('')
const selectedModel = ref<ModelType>('glm')
const isOptimizing = ref(false)
const result = ref('')
const errorMsg = ref('')

async function doOptimize() {
  if (!resumeText.value.trim() || !requirement.value.trim()) return

  isOptimizing.value = true
  errorMsg.value = ''
  result.value = ''

  const res = await localOptimize({
    text: resumeText.value,
    requirement: requirement.value,
    model: selectedModel.value,
    systemPrompt: '你是资深简历优化专家。用户会提供一段简历内容和优化需求，请根据需求进行定向优化。\n\n【通用原则】\n1. 强动词开头：主导/推动/重构/优化/设计/实现/搭建，禁用"负责/参与/协助"\n2. 成果量化：有数字用数字（提升XX%/节省XX万/覆盖XX用户），无数据用规模/频率/范围\n3. CAR结构：背景压力 → 个人行动 → 可验证结果\n4. 简洁：每条2-3句，每句≤25字，删除套话和空泛描述\n\n【输出规范】\n- 直接返回优化后的文本，不要添加任何解释或标记\n- 不要使用 markdown 格式\n- 用换行分隔不同的段落或条目',
  })

  if (res.error) {
    errorMsg.value = res.error
  } else if (res.data) {
    result.value = res.data.optimizedText
  }

  isOptimizing.value = false
}

function reset() {
  result.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800">局部优化器</h1>
      <p class="mt-2 text-gray-500">针对简历中的特定片段进行定向优化</p>
    </div>

    <!-- 输入区 -->
    <div class="space-y-4">
      <div>
        <label class="text-sm font-medium text-gray-700">简历局部信息</label>
        <textarea
          v-model="resumeText"
          placeholder="粘贴需要优化的简历片段，如工作经历、项目经验等"
          class="w-full h-48 p-4 mt-1 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed"
        ></textarea>
        <p class="text-xs text-gray-400 text-right mt-1">{{ resumeText.length }} 字</p>
      </div>

      <div>
        <label class="text-sm font-medium text-gray-700">优化需求</label>
        <textarea
          v-model="requirement"
          placeholder="描述你希望如何优化，如：增加量化指标、突出技术深度、精简表达等"
          class="w-full h-24 p-4 mt-1 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed"
        ></textarea>
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

      <!-- 优化按钮 -->
      <button
        class="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isOptimizing || !resumeText.trim() || !requirement.trim()"
        @click="doOptimize"
      >
        <span v-if="isOptimizing" class="flex items-center justify-center gap-2">
          <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          优化中...
        </span>
        <span v-else>简历片段优化</span>
      </button>

      <!-- 错误提示 -->
      <p v-if="errorMsg" class="text-red-500 text-sm text-center">{{ errorMsg }}</p>
    </div>

    <!-- 结果区 -->
    <div v-if="result" class="space-y-4">
      <hr class="border-gray-200" />
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-700">优化结果</label>
        <button
          class="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          @click="reset"
        >继续优化</button>
      </div>
      <textarea
        :value="result"
        class="w-full h-48 p-4 border border-green-300 rounded-lg resize-y focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm leading-relaxed bg-green-50"
        readonly
      ></textarea>
      <p class="text-xs text-gray-400 text-right">{{ result.length }} 字</p>
    </div>
  </div>
</template>
