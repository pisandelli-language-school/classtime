<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
  initialDate?: string
  initialData?: any
  assignments?: { id: string; name?: string; class?: { name: string; students?: { id: string; name: string }[] } | null; student?: { name: string } | null }[]
}>()

const emit = defineEmits(['update:modelValue', 'save', 'close', 'delete'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const types = ['Normal', 'Reposição', 'Falta', 'Aula Demonstrativa', 'Master Class']
const activeTab = ref<'info' | 'attendance'>('info')

const state = reactive({
  subject: undefined as string | undefined,
  startTime: '',
  endTime: '',
  type: undefined as string | undefined,
  description: '',
  observations: '',
  attendeeIds: [] as string[]
})

const errors = reactive({
  subject: false,
  startTime: false,
  endTime: false,
  type: false,
  description: false,
  attendance: false
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

// Helper to get students for current subject
const currentAssignment = computed(() => {
  return props.assignments?.find(a => a.id === state.subject)
})

const availableStudents = computed(() => {
  return currentAssignment.value?.class?.students || []
})

// Determine if we should show the attendance tab (only if there are students)
const showAttendanceTab = computed(() => {
  return availableStudents.value.length > 0
})

const validateForm = () => {
  errors.subject = !state.subject || state.subject === ''
  errors.startTime = !state.startTime
  errors.endTime = !state.endTime
  errors.type = !state.type
  errors.description = !state.description || state.description === ''

  // Attendance Validation:
  // If Type is NOT 'Falta' AND there are students available, at least one must be present
  if (state.type !== 'Falta' && availableStudents.value.length > 0 && state.attendeeIds.length === 0) {
    errors.attendance = true
  } else {
    errors.attendance = false
  }

  const hasErrors = Object.values(errors).some(v => v === true)
  return !hasErrors
}

watch(() => props.modelValue, (val) => {
  if (val) {
    activeTab.value = 'info' // Reset tab
    if (props.initialData) {
      state.subject = props.initialData.assignmentId || props.initialData.subject
      state.startTime = props.initialData.startTime || '08:00'
      state.endTime = props.initialData.endTime || '09:00'
      state.type = props.initialData.type === 'Cancelamento' ? 'Falta' : (props.initialData.type || 'Normal')
      state.description = props.initialData.description || ''
      state.observations = props.initialData.observations || ''
      // Map initial attendees if available (we need to ensure backend sends them in initialData)
      state.attendeeIds = props.initialData.attendees?.map((a: any) => a.id) || []
    } else {
      state.subject = undefined
      state.startTime = ''
      state.endTime = ''
      state.type = undefined
      state.description = ''
      state.observations = ''
      state.attendeeIds = []

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
  // Immediately close modal
  isOpen.value = false
  emit('save', entryData)
}

const handleClose = () => {
  isOpen.value = false
}

const toggleAttendance = (studentId: string) => {
  if (state.type === 'Falta') return // Readonly if Falta? Or just ignored? User said readonly.

  const idx = state.attendeeIds.indexOf(studentId)
  if (idx > -1) {
    state.attendeeIds.splice(idx, 1)
  } else {
    state.attendeeIds.push(studentId)
  }
}

// Watch Type to disable attendance if Falta (optional, maybe clear it? Or keep checked but greyed out?)
// User said: "Se marcarmos Cancelamento, a nossa lista de presença fica readonly".
// Implies we just disable toggle. I won't clear it automatically in case they switch back.

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

      <!-- Tabs Header -->
      <div class="flex border-b border-slate-100 dark:border-slate-800">
        <button v-for="tab in ['info', 'attendance']" :key="tab"
          @click="showAttendanceTab || tab === 'info' ? activeTab = tab as any : null"
          class="flex-1 py-3 text-sm font-semibold text-center transition-colors relative" :class="[
            activeTab === tab ? 'text-[#0984e3]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            !showAttendanceTab && tab === 'attendance' ? 'opacity-50 cursor-not-allowed' : ''
          ]">
          {{ tab === 'info' ? 'Informações' : 'Presença' }}
          <span v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-0.5 bg-[#0984e3]"></span>
          <span v-if="tab === 'attendance' && errors.attendance"
            class="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500"></span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Info Tab -->
        <div v-show="activeTab === 'info'" class="space-y-4">
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
            <!-- Description and Observations fields (unchanged structure) -->
            <div class="flex justify-between items-center mb-1.5">
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição
                <span class="text-red-500">*</span></label>
              <span class="text-[10px]"
                :class="state.description.length >= 250 ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500'">
                {{ state.description.length }} / 250
              </span>
            </div>
            <UTextarea v-model="state.description" placeholder="Detalhes da atividade..." :rows="3" resize
              class="w-full" maxlength="250" :class="{ 'ring-2 ring-red-500 rounded-md': errors.description }" />
            <p v-if="errors.description" class="text-red-500 text-[10px] mt-1 font-medium">Por favor preencha a
              descrição</p>
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

        <!-- Attendance Tab -->
        <div v-show="activeTab === 'attendance'" class="space-y-4">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">Lista de Presença</h4>
              <span v-if="state.type === 'Falta'"
                class="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                FALTA (Apenas Leitura)
              </span>
            </div>

            <div v-if="availableStudents.length === 0" class="text-center py-8 text-slate-500 text-sm">
              Nenhum aluno cadastrado nesta turma.
            </div>

            <div v-else class="space-y-2">
              <div v-for="student in availableStudents" :key="student.id" @click="toggleAttendance(student.id)"
                class="flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer select-none"
                :class="[
                  state.attendeeIds.includes(student.id)
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500',
                  state.type === 'Falta' ? 'opacity-70 cursor-not-allowed' : ''
                ]">
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                    :class="state.attendeeIds.includes(student.id) ? 'bg-[#0984e3] border-[#0984e3]' : 'bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600'">
                    <UIcon v-if="state.attendeeIds.includes(student.id)" name="i-heroicons-check"
                      class="text-white text-xs" />
                  </div>
                  <span class="text-sm font-medium"
                    :class="state.attendeeIds.includes(student.id) ? 'text-[#0984e3]' : 'text-slate-700 dark:text-slate-300'">
                    {{ student.name }}
                  </span>
                </div>
              </div>
            </div>

            <p v-if="errors.attendance" class="text-red-500 text-[10px] mt-2 font-medium text-center">
              Selecione pelo menos um aluno presente (exceto para Falta).
            </p>
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
