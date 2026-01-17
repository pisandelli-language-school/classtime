<script setup lang="ts">
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const props = defineProps<{
  modelValue: boolean
  data: any
  month: number
  year: number
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loading = ref(false)
const items = ref<{ description: string, amount: number, type: 'CREDIT' | 'DEBIT' }[]>([])
const newItem = ref({ description: '', amount: 0, type: 'CREDIT' })

const addItem = () => {
  if (!newItem.value.description || newItem.value.amount <= 0) return
  items.value.push({ ...newItem.value, type: newItem.value.type as 'CREDIT' | 'DEBIT' })
  newItem.value = { description: '', amount: 0, type: 'CREDIT' }
}

const removeItem = (index: number) => {
  items.value.splice(index, 1)
}

const totalAdjustments = computed(() => {
  return items.value.reduce((acc, item) => {
    return item.type === 'CREDIT' ? acc + item.amount : acc - item.amount
  }, 0)
})

const finalTotal = computed(() => {
  return (props.data?.summary?.amount || 0) + totalAdjustments.value
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const submit = async () => {
  loading.value = true
  try {
    await $fetch('/api/admin/invoices/create', {
      method: 'POST',
      body: {
        teacherId: props.data.teacher.id,
        month: props.month,
        year: props.year,
        items: items.value
      }
    })
    emit('success')
    alert('Fatura fechada com sucesso!')
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Erro ao fechar fatura')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" @click.self="isOpen = false"
    class="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">

      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-slate-900">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">
          Fechar Fatura - {{ data?.teacher?.name }}
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="isOpen = false">
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body (Scrollable) -->
      <div class="overflow-y-auto p-6 space-y-4 flex-1">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-500">Período:</span>
            <span class="font-medium">{{ format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR }) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Horas Totais:</span>
            <span class="font-medium">{{ data?.summary?.totalHours?.toFixed(1) }}h</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
            <span class="text-gray-900 dark:text-gray-200 font-bold">Valor Base:</span>
            <span class="font-bold text-green-600">{{ formatCurrency(data?.summary?.amount) }}</span>
          </div>
        </div>

        <!-- Adjustments -->
        <div class="space-y-2">
          <h4 class="text-sm font-medium">Lançamentos Adicionais</h4>
          <div class="flex gap-2 items-end">
            <UInput v-model="newItem.description" placeholder="Descrição (ex: Bônus, Atraso)" class="flex-1"
              size="sm" />
            <UInput v-model.number="newItem.amount" type="number" placeholder="Valor" class="w-24" size="sm" />
            <USelectMenu v-model="newItem.type" :options="['CREDIT', 'DEBIT']" class="w-24" size="sm" />
            <UButton icon="i-heroicons-plus" size="sm" color="neutral" @click="addItem" />
          </div>

          <ul class="text-sm space-y-1">
            <li v-for="(item, idx) in items" :key="idx"
              class="flex justify-between items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
              <span>{{ item.description }}</span>
              <div class="flex items-center gap-2">
                <span :class="item.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'">
                  {{ item.type === 'CREDIT' ? '+' : '-' }}{{ formatCurrency(item.amount) }}
                </span>
                <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="removeItem(idx)" />
              </div>
            </li>
          </ul>
        </div>

        <!-- Final Total -->
        <div class="flex justify-between items-center text-lg font-bold border-t pt-4">
          <span>Total Final:</span>
          <span class="text-primary-600">{{ formatCurrency(finalTotal) }}</span>
        </div>

        <div class="text-xs text-center text-gray-500">
          A previsão de pagamento será para: <span class="font-medium">{{ format(new Date(Date.now() + 5 * 24 * 60 * 60
            *
            1000), 'dd/MM/yyyy') }}</span> (aprox)
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancelar</UButton>
        <UButton color="success" :loading="loading" @click="submit">Confirmar Fechamento</UButton>
      </div>
    </div>
  </div>
</template>
