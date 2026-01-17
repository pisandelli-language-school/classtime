<script setup lang="ts">
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const route = useRoute()
const invoiceId = route.params.id as string

const { data: rawInvoice, pending, error } = useFetch(`/api/admin/invoices/${invoiceId}`)
const invoice = computed(() => rawInvoice.value as any)

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
}


const formatDate = (d: string | Date) => {
  if (!d) return '-'
  return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR })
}

const print = () => {
  window.print()
}
</script>

<template>
  <div
    class="h-full bg-gray-100 dark:bg-gray-900 p-8 overflow-auto print:p-0 print:bg-white print:dark:bg-white print:overflow-visible">
    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
    </div>
    <div v-else-if="error || !invoice" class="text-center text-red-500">
      Fatura não encontrada.
    </div>

    <div v-else
      class="max-w-3xl mx-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-gray-100 shadow-xl rounded-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:dark:text-black print:dark:bg-white">

      <!-- Header Actions (Hidden on Print) -->
      <div
        class="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center print:hidden">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" to="/admin/invoices">Voltar</UButton>
        <UButton icon="i-heroicons-printer" color="primary" @click="print">Imprimir</UButton>
      </div>

      <!-- Invoice Document -->
      <div class="p-12 print:p-8">
        <!-- Header -->
        <div class="flex justify-between items-start mb-12">
          <div>
            <h1 class="text-3xl font-bold text-primary-600 mb-2">ClassTime</h1>
            <div class="text-sm text-gray-500">Comprovante de Pagamento</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Fatura #</div>
            <div class="font-mono font-bold">{{ invoice.id.slice(0, 8).toUpperCase() }}</div>
            <div class="mt-2 text-sm text-gray-500">Data de Emissão</div>
            <div>{{ formatDate(invoice.createdAt) }}</div>
          </div>
        </div>

        <!-- Provider & Period -->
        <div class="grid grid-cols-2 gap-8 mb-12 border-b-2 border-gray-100 pb-8">
          <div>
            <h3 class="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Prestador (Professor)</h3>
            <div class="text-xl font-bold">{{ invoice.teacher.name }}</div>
            <div class="text-gray-600">{{ invoice.teacher.email }}</div>
          </div>
          <div class="text-right">
            <h3 class="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Período de Referência</h3>
            <div class="text-xl font-bold capitalize">
              {{ format(new Date(invoice.year, invoice.month - 1), 'MMMM yyyy', { locale: ptBR }) }}
            </div>
          </div>
        </div>

        <!-- Details Table -->
        <table class="w-full mb-12">
          <thead>
            <tr class="border-b-2 border-gray-100">
              <th class="text-left py-3 text-sm font-bold text-gray-500 uppercase">Descrição</th>
              <th class="text-right py-3 text-sm font-bold text-gray-500 uppercase">Qtd / Detalhes</th>
              <th class="text-right py-3 text-sm font-bold text-gray-500 uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody class="text-gray-700 dark:text-gray-300 print:text-black">
            <!-- Base Hours -->
            <tr class="border-b border-gray-50">
              <td class="py-4">Horas Trabalhadas (Aprovadas)</td>
              <td class="py-4 text-right">{{ Number(invoice.totalHours).toFixed(2) }}h @ {{
                formatCurrency(invoice.hourlyRateSnapshot) }}/h</td>
              <td class="py-4 text-right font-medium">
                {{ formatCurrency(Number(invoice.totalHours) * Number(invoice.hourlyRateSnapshot)) }}
              </td>
            </tr>

            <!-- Adjustments -->
            <tr v-for="item in invoice.items" :key="item.id" class="border-b border-gray-50">
              <td class="py-4">
                {{ item.description }}
                <UBadge size="xs" variant="soft" :color="item.type === 'CREDIT' ? 'success' : 'error'"
                  class="ml-2 print:hidden">{{ item.type }}</UBadge>
              </td>
              <td class="py-4 text-right text-gray-400 italic">-</td>
              <td class="py-4 text-right font-medium"
                :class="item.type === 'DEBIT' ? 'text-red-500 print:text-black' : ''">
                {{ item.type === 'DEBIT' ? '-' : '' }}{{ formatCurrency(item.amount) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex justify-end mb-12">
          <div class="w-64">
            <div
              class="flex justify-between items-center py-2 border-t-2 border-gray-900 dark:border-white print:border-black">
              <span class="font-bold text-lg">Total a Pagar</span>
              <span class="font-bold text-2xl text-primary-600 print:text-black">{{ formatCurrency(invoice.totalAmount)
                }}</span>
            </div>
            <div class="mt-4 text-xs text-gray-500 text-right">
              Previsão de Pagamento: <strong>{{ formatDate(invoice.paymentDueDate) }}</strong>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center text-gray-400 text-sm mt-20 pt-8 border-t border-gray-100">
          <p>ClassTime System • {{ formatDate(new Date()) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    margin: 0;
  }

  body {
    background-color: white;
    -webkit-print-color-adjust: exact;
  }
}
</style>
