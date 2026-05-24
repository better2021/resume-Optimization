<script setup lang="ts">
defineProps<{
  modelValue: string
  fileName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium text-gray-700">简历内容</label>
      <span class="text-xs text-gray-400">{{ fileName }}</span>
    </div>
    <textarea
      :value="modelValue"
      :placeholder="`${fileName} 的内容将显示在此处，你可以直接编辑修改`"
      class="w-full h-80 p-4 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm leading-relaxed font-mono"
      @input="onInput"
    ></textarea>
    <p class="text-xs text-gray-400 text-right">{{ modelValue.length }} 字</p>
  </div>
</template>
