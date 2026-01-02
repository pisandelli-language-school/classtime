<script setup lang="ts">
import { z } from 'zod';

const props = defineProps<{
  modelValue: boolean
  contract?: any // If null, create mode
}>()

const emit = defineEmits(['update:modelValue', 'refresh'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Data Fetching for Users
const usersStore = useUsersStore()
const { teachers, isLoading: isUsersLoading } = storeToRefs(usersStore)

onMounted(() => {
  usersStore.fetchUsers()
})

// State
const mode = ref<'CREATE' | 'EDIT'>('CREATE')
const isLoading = ref(false)

// Form Schema
const schema = z.object({
  name: z.string().optional(), // Required in CREATE
  type: z.string().optional(), // Required in CREATE
  teacherId: z.string().optional(),
  totalHours: z.number().min(0.5, 'Mínimo 0.5 hora'),
  weeklyHours: z.number().min(0, 'Não pode ser negativo'),
  startDate: z.string().min(1, 'Data obrigatória'),
  endDate: z.string().optional(),
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  type: 'Turma', // Default
  teacherId: undefined as string | undefined,
  totalHours: 40,
  weeklyHours: 2,
  startDate: new Date().toISOString().split('T')[0],
  endDate: ''
})

const selectedTeacher = computed(() => {
  return teachers.value.find((t: any) => t.dbId === state.teacherId)
})

// Auto Calculate End Date
const autoCalcEndDate = () => {
  if (state.totalHours > 0 && state.weeklyHours > 0 && state.startDate) {
    const weeks = state.totalHours / state.weeklyHours;
    const days = weeks * 7;
    const start = new Date(state.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    state.endDate = end.toISOString().split('T')[0] ?? '';
  }
}

watch(() => [state.totalHours, state.weeklyHours, state.startDate], () => {
  autoCalcEndDate();
})

// Init Logic
watch(() => props.contract, (newVal) => {
  if (newVal) {
    mode.value = 'EDIT' // Default to edit
    state.totalHours = Number(newVal.totalHours)
    state.weeklyHours = Number(newVal.weeklyHours)
    state.startDate = newVal.startDate ? new Date(newVal.startDate).toISOString().split('T')[0] : ''
    state.endDate = newVal.predictedEndDate ? new Date(newVal.predictedEndDate).toISOString().split('T')[0] ?? '' : ''
    state.teacherId = newVal.teacher?.id
    // Name/Type hidden/fixed
  } else {
    mode.value = 'CREATE'
    state.name = ''
    state.type = 'Turma'
    state.teacherId = undefined
    state.totalHours = 40
    state.weeklyHours = 2
    state.startDate = new Date().toISOString().split('T')[0]
    autoCalcEndDate()
  }
}, { immediate: true })

const modeDescription = computed(() => {
  return 'Necessário editar o contrato?'
})

const toast = useToast()

const formGroupUI = {
  label: {
    base: 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'
  }
}

const handleClose = () => {
  isOpen.value = false
}
// Removed handleRenewToggle

const onSubmit = async () => {
  isLoading.value = true
  try {
    // Validation
    if (mode.value === 'CREATE' && !state.name) {
      toast.add({ title: 'Erro', description: 'Informe o Nome', color: 'error' })
      isLoading.value = false
      return
    }

    if (mode.value === 'CREATE') {
      // POST
      const payload: any = {
        totalHours: state.totalHours,
        weeklyHours: state.weeklyHours,
        startDate: state.startDate,
        endDate: state.endDate,
        name: state.name,
        type: state.type,
        teacherId: state.teacherId,
        // Removed Renew logic
      }

      await $fetch('/api/admin/contracts', {
        method: 'POST',
        body: payload
      })

      toast.add({ title: 'Sucesso', description: 'Contrato criado!', color: 'success' })

    } else {
      // EDIT (PUT)
      await $fetch(`/api/admin/contracts/${props.contract.id}`, {
        method: 'PUT',
        body: {
          totalHours: state.totalHours,
          weeklyHours: state.weeklyHours,
          startDate: state.startDate,
          endDate: state.endDate,
          teacherId: state.teacherId
        }
      })
      toast.add({ title: 'Sucesso', description: 'Contrato atualizado.', color: 'success' })
    }

    emit('refresh')
    isOpen.value = false

  } catch (error: any) {
    toast.add({ title: 'Erro', description: error.statusMessage || 'Erro ao salvar', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Tem certeza que deseja excluir este contrato? Essa ação não pode ser desfeita.')) return

  isLoading.value = true
  try {
    await $fetch(`/api/admin/contracts/${props.contract.id}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Sucesso', description: 'Contrato excluído.', color: 'success' })
    emit('refresh')
    isOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Erro', description: error.statusMessage || 'Erro ao excluir', color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" @click.self="handleClose"
    class="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div class="flex flex-col">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">
            {{ mode === 'CREATE' ? 'Novo Contrato' : 'Editar Contrato' }}
          </h3>
          <p v-if="props.contract" class="text-xs text-slate-500">{{ props.contract.subjectName }}</p>
        </div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Removed Renew Toggle UI -->

      <div class="p-6">
        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

          <!-- Name & Type (Create Only) -->
          <div v-if="mode === 'CREATE'" class="space-y-4">
            <!-- Name Field -->
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Nome <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input v-model="state.name" placeholder="Ex: Fraport Advanced ou Pedro Antônio" type="text"
                  class="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-900 dark:ring-slate-700 dark:text-white" />
              </div>
            </div>

            <!-- Type Toggle -->
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Tipo <span class="text-red-500">*</span>
              </label>
              <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button type="button" @click="state.type = 'Turma'"
                  class="flex-1 text-xs font-bold py-1.5 rounded-md transition-all"
                  :class="state.type === 'Turma' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'">
                  Turma
                </button>
                <button type="button" @click="state.type = 'Aluno'"
                  class="flex-1 text-xs font-bold py-1.5 rounded-md transition-all"
                  :class="state.type === 'Aluno' ? 'bg-white dark:bg-slate-700 shadow-sm text-secondary' : 'text-slate-500 hover:text-slate-700'">
                  VIP
                </button>
              </div>
            </div>
          </div>

          <!-- Teacher Selection (Create & Edit) -->
          <div v-if="mode === 'CREATE' || mode === 'EDIT'">
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Professor Responsável
            </label>
            <div class="relative">
              <select v-model="state.teacherId"
                class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isUsersLoading">
                <option :value="undefined">Selecione um Professor (Opcional)</option>
                <option v-for="teacher in teachers" :key="teacher.dbId" :value="teacher.dbId">
                  {{ teacher.name }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <UIcon v-if="isUsersLoading" name="i-heroicons-arrow-path" class="animate-spin text-lg" />
                <span v-else class="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Total de Horas <span class="text-red-500">*</span>
              </label>
              <input v-model.number="state.totalHours" type="number" step="0.5"
                class="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-900 dark:ring-slate-700 dark:text-white" />
            </div>

            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Horas Semanais <span class="text-red-500">*</span>
              </label>
              <input v-model.number="state.weeklyHours" type="number" step="0.5"
                class="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-900 dark:ring-slate-700 dark:text-white" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Início <span class="text-red-500">*</span>
              </label>
              <input v-model="state.startDate" type="date" lang="pt-BR"
                class="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-900 dark:ring-slate-700 dark:text-white" />
            </div>

            <div>
              <label
                class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Previsão Fim
              </label>
              <input v-model="state.endDate" type="date"
                class="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-900 dark:ring-slate-700 dark:text-white" />
            </div>
          </div>

          <!-- Hidden submit for standard form behavior if needed, but we use footer buttons -->
        </UForm>
      </div>

      <!-- Footer Buttons (Styled like TimesheetModal) -->
      <div
        class="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
        <button v-if="mode === 'EDIT'"
          class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors mr-auto"
          @click="handleDelete">
          Excluir
        </button>

        <button
          class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          @click="handleClose">
          Cancelar
        </button>

        <button @click="onSubmit"
          class="px-6 py-2 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold rounded-full shadow-lg shadow-[#0984e3]/30 transition-all flex items-center gap-2"
          :disabled="isLoading">
          <UIcon v-if="isLoading" name="i-heroicons-arrow-path" class="animate-spin" />
          {{ 'Salvar' }}
        </button>
      </div>

    </div>
  </div>
</template>
