<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  initialDate?: string
  initialData?: any
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const state = reactive({
  subject: undefined,
  hours: '',
  startTime: '',
  endTime: '',
  type: 'Normal',
  description: ''
})

watch(() => props.modelValue, (val: boolean) => {
  if (val) {
    if (props.initialData) {
      // Edit mode
      Object.assign(state, {
        subject: props.initialData.subject,
        hours: props.initialData.hours,
        startTime: props.initialData.startTime,
        endTime: props.initialData.endTime,
        type: props.initialData.type || 'Normal',
        description: props.initialData.description
      })
    } else {
      // Create mode - reset
      state.subject = undefined
      state.hours = ''
      state.startTime = ''
      state.endTime = ''
      state.type = 'Normal'
      state.description = ''
    }
  }
})

const subjects = ['Alice M. - Math Tutoring', 'Grade 10 Biology', 'Physics Lab', 'Staff Meeting']
const types = ['Normal', 'Reposição', 'Cancelamento', 'Aula Demonstrativa', 'Master Class']

const handleSave = () => {
  const entryData = {
    date: props.initialDate,
    ...state,
    id: props.initialData?.id // Include ID if editing
  }
  console.log('Saving entry:', entryData)
  emit('save', entryData)
  isOpen.value = false
}

const handleClose = () => {
  isOpen.value = false
}
</script>

<template>
  <div v-if="isOpen" @click.self="handleClose"
    class="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">
          {{ initialData ? 'Edit Log' : 'Log Time' }} <span v-if="initialDate" class="text-slate-500 font-normal">for {{
            initialDate
          }}</span>
        </h3>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div class="space-y-4">
          <div class="grid grid-cols-4 gap-4">
            <div class="col-span-3">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Class
                / Student</label>
              <div class="relative">
                <select v-model="state.subject"
                  class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white">
                  <option :value="undefined" disabled>Select Class or Student...</option>
                  <option v-for="opt in subjects" :key="opt" :value="opt" class="dark:bg-slate-900">{{ opt }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span class="material-symbols-outlined text-lg">expand_more</span>
                </div>
              </div>
            </div>
            <div class="col-span-1">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Hours</label>
              <UInput v-model="state.hours" placeholder="0h" class="text-center w-full" input-class="text-center"
                size="md" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Start
                Time</label>
              <UInput v-model="state.startTime" type="time" class="w-full" size="md" />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">End
                Time</label>
              <UInput v-model="state.endTime" type="time" class="w-full" size="md" />
            </div>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Type</label>
            <div class="relative">
              <select v-model="state.type"
                class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white">
                <option v-for="opt in types" :key="opt" :value="opt" class="dark:bg-slate-900">{{ opt }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <span class="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</label>
              <span class="text-[10px] text-slate-400 dark:text-slate-500">Max 250 chars</span>
            </div>
            <UTextarea v-model="state.description" placeholder="Enter activity details..." :rows="3" resize
              class="w-full" />
          </div>
        </div>

        <div
          class="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 -mx-6 -mb-6 mt-4">
          <button
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            @click="handleClose">
            Cancel
          </button>
          <button @click="handleSave"
            class="px-6 py-2 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold rounded-full shadow-lg shadow-[#0984e3]/30 transition-all">
            Save Log
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
