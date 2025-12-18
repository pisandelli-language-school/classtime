<script setup lang="ts">
import { reactive, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  initialDate?: string
  initialData?: any
  assignments?: { id: string; name?: string; class?: { name: string } | null; student?: { name: string } | null }[]
}>()

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const types = ['Normal', 'Reposição', 'Cancelamento', 'Aula Demonstrativa', 'Master Class']

const state = reactive({
  subject: undefined as string | undefined,
  startTime: '',
  endTime: '',
  type: undefined as string | undefined,
  description: '',
  observations: ''
})

const errors = reactive({
  subject: false,
  startTime: false,
  endTime: false,
  type: false
})

const calculatedDuration = computed(() => {
  if (!state.startTime || !state.endTime) return '0.0'

  const [startH = 0, startM = 0] = state.startTime.split(':').map(Number)
  const [endH = 0, endM = 0] = state.endTime.split(':').map(Number)

  const start = startH + startM / 60
  const end = endH + endM / 60

  const duration = end - start
  return duration > 0 ? (duration).toFixed(1) : '0.0'
})

const validateForm = () => {
  errors.subject = !state.subject || state.subject === ''
  errors.startTime = !state.startTime
  errors.endTime = !state.endTime
  errors.type = !state.type

  const hasErrors = Object.values(errors).some(v => v === true)
  return !hasErrors
}

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.initialData) {
      state.subject = props.initialData.assignmentId || props.initialData.subject // Handle both
      state.startTime = props.initialData.startTime || '08:00'
      state.endTime = props.initialData.endTime || '09:00'
      state.type = props.initialData.type || 'Normal'
      state.description = props.initialData.description || ''
      state.observations = props.initialData.observations || ''
    } else {
      state.subject = undefined
      state.startTime = '08:00'
      state.endTime = ''
      state.type = 'Normal'
      state.description = ''
      state.observations = ''

      Object.keys(errors).forEach(key => errors[key as keyof typeof errors] = false)
    }
  }
})

const handleSave = () => {
  if (!validateForm()) return

  const entryData = {
    date: props.initialDate,
    ...state,
    hours: calculatedDuration.value,
    id: props.initialData?.id
  }
  // Immediately close modal to allow global loading overlay to take over
  isOpen.value = false
  emit('save', entryData)
}

const handleClose = () => {
  isOpen.value = false
}

const formattedDate = computed(() => {
  if (!props.initialDate) return ''
  const date = new Date(props.initialDate)
  if (isNaN(date.getTime())) return props.initialDate

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <div v-if="isOpen" @click.self="handleClose"
    class="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div class="flex flex-col">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ initialData ? 'Editar Lançamento' : 'Lançar Horas' }}
          </h3>
          <p v-if="initialDate" class="text-[#0984e3] font-medium text-base mt-0.5">
            {{ formattedDate }}
          </p>
        </div>
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
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Turma
                / Aluno <span class="text-red-500">*</span></label>
              <div class="relative">
                <select v-model="state.subject"
                  :class="{ 'ring-2 ring-red-500 dark:ring-red-500 focus:ring-red-500': errors.subject, 'ring-1 ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-[#0984e3]': !errors.subject }"
                  class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-inset sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:text-white transition-all">
                  <option :value="undefined" disabled>Selecione Turma ou Aluno...</option>
                  <option v-for="opt in (assignments || [])" :key="opt.id" :value="opt.id" class="dark:bg-slate-900">{{
                    opt.name || opt.class?.name || opt.student?.name }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span class="material-symbols-outlined text-lg">expand_more</span>
                </div>
              </div>
              <p v-if="errors.subject" class="text-red-500 text-[10px] mt-1 font-medium">Por favor selecione uma opção
              </p>
            </div>
            <div
              class="col-span-1 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center p-2">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Duração</span>
              <span class="text-xl font-bold text-slate-900 dark:text-white">{{ calculatedDuration }}h</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Início
                <span class="text-red-500">*</span></label>
              <UInput v-model="state.startTime" type="time" class="w-full" size="md"
                :class="{ 'ring-2 ring-red-500 rounded-md': errors.startTime }" />
            </div>
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fim
                <span class="text-red-500">*</span></label>
              <UInput v-model="state.endTime" type="time" class="w-full" size="md"
                :class="{ 'ring-2 ring-red-500 rounded-md': errors.endTime }" />
            </div>
          </div>

          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo
              <span class="text-red-500">*</span></label>
            <div class="relative">
              <select v-model="state.type"
                :class="{ 'ring-2 ring-red-500 dark:ring-red-500 focus:ring-red-500': errors.type, 'ring-1 ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-[#0984e3]': !errors.type }"
                class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-inset sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:text-white transition-all">
                <option :value="undefined" disabled>Selecione o Tipo...</option>
                <option v-for="opt in types" :key="opt" :value="opt" class="dark:bg-slate-900">{{ opt }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <span class="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
            <p v-if="errors.type" class="text-red-500 text-[10px] mt-1 font-medium">Por favor selecione um tipo</p>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição</label>
              <span class="text-[10px]"
                :class="state.description.length >= 250 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500'">
                {{ state.description.length }} / 250
              </span>
            </div>
            <UTextarea v-model="state.description" placeholder="Detalhes da atividade..." :rows="3" resize
              class="w-full" maxlength="250" />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Observações</label>
              <span class="text-[10px]"
                :class="state.observations.length >= 250 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500'">
                {{ state.observations.length }} / 250
              </span>
            </div>
            <UTextarea v-model="state.observations" placeholder="Observações adicionais..." :rows="3" resize
              class="w-full" maxlength="250" />
          </div>
        </div>

        <div
          class="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 -mx-6 -mb-6 mt-4">
          <button
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            @click="handleClose">
            Cancelar
          </button>

          <button v-if="initialData && initialData.id" @click="$emit('delete', initialData.id)"
            class="px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors mr-auto">
            Excluir
          </button>

          <button @click="handleSave"
            class="px-6 py-2 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold rounded-full shadow-lg shadow-[#0984e3]/30 transition-all">
            Salvar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
