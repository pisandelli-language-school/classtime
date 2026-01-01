<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  modelValue: boolean
  user: any // Replace with proper type if available
}>()

const emit = defineEmits(['update:modelValue', 'refresh'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const state = reactive({
  hourlyRate: 0,
  monthlyExpectedHours: 0
})

// Initialize state when user changes
watch(() => props.user, (newUser) => {
  if (newUser) {
    state.hourlyRate = newUser.hourlyRate || 0
    state.monthlyExpectedHours = newUser.monthlyExpectedHours || 0
  }
}, { immediate: true })

const schema = z.object({
  hourlyRate: z.number().min(0, 'O valor deve ser positivo'),
  monthlyExpectedHours: z.number().min(0, 'As horas devem ser positivas')
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch(`/api/admin/users/${props.user.id}`, {
      method: 'PUT',
      body: event.data
    })

    useToast().add({ title: 'Sucesso', description: 'Dados atualizados com sucesso.', color: 'success' })
    emit('refresh')
    isOpen.value = false
  } catch (err: any) {
    useToast().add({ title: 'Erro', description: err.data?.message || 'Erro ao salvar changes.', color: 'error' })
  } finally {
    loading.value = false
  }
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

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">
          Editar Professor
        </h3>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- User Profile Header -->
        <div class="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg" v-if="user">
          <UAvatar :src="user.avatar || undefined" :alt="user.name" size="lg" />
          <div>
            <p class="font-bold text-gray-900 dark:text-white">{{ user.name }}</p>
            <p class="text-sm text-gray-500">{{ user.email }}</p>
            <div class="mt-1">
              <UBadge color="success" variant="subtle" size="xs">Professor</UBadge>
            </div>
          </div>
        </div>

        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormGroup label="Valor Hora (R$)" name="hourlyRate" help="Valor pago por hora de aula">
              <UInput v-model.number="state.hourlyRate" type="number" step="0.01" icon="i-heroicons-currency-dollar" />
            </UFormGroup>

            <UFormGroup label="Horas Mensais (Meta)" name="monthlyExpectedHours" help="Expectativa de horas/mês">
              <UInput v-model.number="state.monthlyExpectedHours" type="number" step="1" icon="i-heroicons-clock" />
            </UFormGroup>
          </div>

          <!-- Footer Buttons -->
          <div
            class="px-6 py-4 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 -mx-6 -mb-6 mt-4">
            <button type="button"
              class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              @click="handleClose">
              Cancelar
            </button>
            <button type="submit"
              class="px-6 py-2 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold rounded-full shadow-lg shadow-[#0984e3]/30 transition-all flex items-center justify-center gap-2"
              :disabled="loading">
              <UIcon v-if="loading" name="i-heroicons-arrow-path" class="animate-spin" />
              Salvar Alterações
            </button>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>
