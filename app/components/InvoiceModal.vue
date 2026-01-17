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
const newItem = ref({ description: '', amountInput: '' })

const addItem = (type: 'CREDIT' | 'DEBIT') => {
  const amountValue = parseFloat(newItem.value.amountInput.replace(/\./g, '').replace(',', '.'))
  if (!newItem.value.description || isNaN(amountValue) || amountValue <= 0) return
  items.value.push({
    description: newItem.value.description,
    amount: amountValue,
    type
  })
  newItem.value = { description: '', amountInput: '' }
}
// ... (skip intermediate lines) ...


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
      class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">

      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
        <div class="flex items-center gap-4">
          <UAvatar :src="data?.teacher?.avatar || undefined" :alt="data?.teacher?.name || undefined" size="md" />
          <div>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fechar Fatura</span>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {{ data?.teacher?.name }}
            </h3>
          </div>
        </div>
        <button
          class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          @click="isOpen = false">
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Body (Scrollable) -->
      <div class="overflow-y-auto p-6 space-y-6 flex-1">
        <!-- Summary Box -->
        <div
          class="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
          <div class="flex justify-between items-center text-sm">
            <span class="text-slate-500">Período de Referência</span>
            <span class="font-semibold text-slate-700 dark:text-slate-200 capitalize">{{ format(new Date(year, month -
              1), 'MMMM yyyy', {
              locale: ptBR
            }) }}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-slate-500">Horas Totais Aprovadas</span>
            <span class="font-mono font-medium text-slate-700 dark:text-slate-200">{{
              data?.summary?.totalHours?.toFixed(1) }}h</span>
          </div>
          <div class="pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span class="text-slate-900 dark:text-white font-bold">Valor Calculado</span>
            <span class="font-bold text-lg text-slate-900 dark:text-white font-mono">{{
              formatCurrency(data?.summary?.amount) }}</span>
          </div>
        </div>

        <!-- Adjustments -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white">Adicionais / Descontos</h4>
          </div>

          <div class="flex gap-2 items-start">
            <UInput v-model="newItem.description" placeholder="Descrição (ex: Bônus)" class="flex-1"
              icon="i-heroicons-pencil" />
            <div class="flex gap-2 items-center">
              <UInput v-model="newItem.amountInput" type="text" placeholder="0,00" class="w-32">
                <template #leading>
                  <span class="text-slate-500 text-xs font-bold pl-1">R$</span>
                </template>
              </UInput>
              <div class="flex gap-px">
                <UButton icon="i-heroicons-plus" color="success" variant="solid" @click="addItem('CREDIT')"
                  :disabled="!newItem.description || !newItem.amountInput" class="rounded-l-md rounded-r-none" />
                <UButton icon="i-heroicons-minus" color="error" variant="solid" @click="addItem('DEBIT')"
                  :disabled="!newItem.description || !newItem.amountInput" class="rounded-r-md rounded-l-none" />
              </div>
            </div>
          </div>

          <div v-if="items.length > 0"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <li v-for="(item, idx) in items" :key="idx"
                class="flex justify-between items-center px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <span class="text-slate-600 dark:text-slate-300 font-medium">{{ item.description }}</span>
                <div class="flex items-center gap-3">
                  <span
                    :class="item.type === 'CREDIT' ? 'text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded text-xs font-bold' : 'text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-xs font-bold'">
                    {{ item.type === 'CREDIT' ? '+' : '-' }} {{ formatCurrency(item.amount) }}
                  </span>
                  <UButton icon="i-heroicons-trash" size="xs" color="neutral" variant="ghost" @click="removeItem(idx)"
                    class="hover:text-red-500" />
                </div>
              </li>
            </ul>
          </div>
          <p v-else class="text-xs text-slate-400 text-center py-2 italic">Nenhum lançamento adicional.</p>
        </div>

        <!-- Final Total -->
        <div class="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
          <div class="flex flex-col">
            <span class="text-sm text-slate-500">Total Líquido a Pagar</span>
            <span class="text-xs text-slate-400">Previsão: {{ format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              'dd/MM/yyyy') }}</span>
          </div>
          <span class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{{ formatCurrency(finalTotal)
          }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900">
        <UButton color="neutral" variant="ghost" @click="isOpen = false" size="md">Cancelar</UButton>
        <UButton color="primary" :loading="loading" @click="submit" size="md" icon="i-heroicons-check">Confirmar
          Fechamento
        </UButton>
      </div>
    </div>
  </div>
</template>
