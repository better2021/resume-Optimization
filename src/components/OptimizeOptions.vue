<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GoalType, OptimizeGoal } from '@/types'

const goals: OptimizeGoal[] = [
  {
    value: 'highlight-achievements',
    label: '突出成果',
    description: '重点突出量化成果和项目影响',
  },
  {
    value: 'match-jd',
    label: '匹配 JD',
    description: '根据职位描述进行针对性优化',
  },
  {
    value: 'concise',
    label: '精简表达',
    description: '精简语言，突出关键信息',
  },
  {
    value: 'highlight-skills',
    label: '突出技能',
    description: '强化技术栈和专业能力展示',
  },
  {
    value: 'career-pivot',
    label: '职业转型',
    description: '跨行业/职能转型，挖掘可迁移能力',
  },
  {
    value: 'level-up',
    label: '向上突破',
    description: '冲击更高职级时的视角升维',
  },
]

const selectedGoal = defineModel<GoalType>('goal', { required: true })
const jdText = defineModel<string>('jd', { default: '' })

const showJDInput = computed(() => selectedGoal.value === 'match-jd')
</script>

<template>
  <div class="space-y-4">
    <label class="text-sm font-medium text-gray-700">优化目标</label>

    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="goal in goals"
        :key="goal.value"
        type="button"
        class="p-3 rounded-lg border-2 text-left transition-all"
        :class="
          selectedGoal === goal.value
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-gray-300 text-gray-600'
        "
        @click="selectedGoal = goal.value"
      >
        <div class="font-medium text-sm">{{ goal.label }}</div>
        <div class="text-xs mt-0.5 opacity-75">{{ goal.description }}</div>
      </button>
    </div>

    <!-- 匹配 JD 模式：输入职位描述 -->
    <div v-if="showJDInput" class="space-y-1">
      <label class="text-xs text-gray-500">粘贴职位描述（JD）</label>
      <textarea
        v-model="jdText"
        rows="4"
        placeholder="将职位描述粘贴到这里，AI 会根据 JD 关键词优化简历..."
        class="w-full p-3 border border-gray-300 rounded-lg resize-y text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      ></textarea>
    </div>
  </div>
</template>
