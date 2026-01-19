<script setup lang="ts">
const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator(value: string) {
      return ['info', 'success', 'warning', 'error'].includes(value)
    }
  }
})

const iconMap: Record<string, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error'
}

const styleMap: Record<string, string> = {
  info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
  success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/40 text-green-800 dark:text-green-200',
  warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-200'
}

const computedClass = computed(() => styleMap[props.type] || styleMap.info)
</script>

<template>
  <div class="my-6 p-4 rounded-lg flex items-start gap-3 text-sm border" :class="computedClass">
    <div class="flex h-6 w-6 shrink-0 items-center justify-center select-none">
      <span class="material-symbols-outlined text-[20px]">{{ iconMap[type] }}</span>
    </div>
    <div class="flex-1 leading-6">
      <slot />
    </div>
  </div>
</template>

<style scoped>
:deep(p:first-child) {
  margin-top: 0;
}

:deep(p:last-child) {
  margin-bottom: 0;
}
</style>
