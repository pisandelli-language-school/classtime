<script setup lang="ts">
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const now = new Date()
const selectedDate = ref({ month: now.getMonth() + 1, year: now.getFullYear() })

if (now.getDate() <= 10) {
  const prev = subMonths(now, 1)
  selectedDate.value = { month: prev.getMonth() + 1, year: prev.getFullYear() }
}

const { data: invoicesData, refresh, pending } = await useFetch('/api/admin/invoices', {
  query: computed(() => ({
    month: selectedDate.value.month,
    year: selectedDate.value.year
  }))
})

const invoices = computed(() => invoicesData.value?.data || [])

const isModalOpen = ref(false)
const selectedTeacherForInvoice = ref<any>(null)

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const getStatusColor = (status: string) => {
  if (status === 'READY') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (status === 'PENDING') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  if (status === 'CLOSED') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (status === 'PAID') return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  return 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string) => {
  if (status === 'READY') return 'Pronto para Fechar'
  if (status === 'PENDING') return 'Pendências'
  if (status === 'CLOSED') return 'Fechado'
  if (status === 'PAID') return 'Pago'
  return status
}

const openInvoiceModal = (item: any) => {
  selectedTeacherForInvoice.value = item
  isModalOpen.value = true
}

const handleInvoiceCreated = () => {
  refresh()
  isModalOpen.value = false
}

const router = useRouter()
const viewInvoice = (invoiceId: string) => {
  router.push(`/admin/invoices/${invoiceId}`)
}
</script>

<template>
  <div class="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
      <div class="max-w-[1600px] mx-auto w-full flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Fechamento de Folha</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Gerencie faturas e pagamentos mensais.</p>
        </div>

        <!-- Month Selector -->
        <div class="flex items-center gap-2">
          <USelectMenu v-model="selectedDate.year" :options="[2024, 2025, 2026]" class="w-24" />
          <USelectMenu v-model="selectedDate.month"
            :options="Array.from({ length: 12 }, (_, i) => ({ label: format(new Date(2000, i, 1), 'MMMM', { locale: ptBR }), value: i + 1 }))"
            option-attribute="label" value-attribute="value" class="w-40 capitalize" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <main class="flex-1 overflow-auto p-6">
      <div class="max-w-[1600px] mx-auto w-full">
        <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } as any }">
          <div v-if="pending" class="p-8 text-center text-slate-500">
            Carregando...
          </div>

          <div v-else-if="invoices.length === 0" class="p-8 text-center text-slate-500">
            Nenhum professor encontrado para este período.
          </div>

          <!-- Custom Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Professor
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Horas
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Valor Est.
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                <tr v-for="invoice in invoices" :key="invoice.teacher.id"
                  class="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <!-- Teacher -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <UAvatar :alt="invoice.teacher.name || undefined" size="xs" />
                      <span class="font-medium text-slate-900 dark:text-white">{{ invoice.teacher.name }}</span>
                    </div>
                  </td>

                  <!-- Hours -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                    {{ Number(invoice.summary?.totalHours || 0).toFixed(1) }}h
                  </td>

                  <!-- Amount -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                    {{ formatCurrency(Number(invoice.summary?.amount || 0)) }}
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusColor(invoice.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                      {{ getStatusLabel(invoice.status) }}
                    </span>
                    <span v-if="(invoice as any).missingApprovals > 0" class="text-xs text-red-500 ml-2">
                      ({{ (invoice as any).missingApprovals }} pendentes)
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end gap-2">
                      <!-- Create Invoice -->
                      <UButton v-if="invoice.status === 'READY'" size="xs" color="primary" variant="solid"
                        icon="i-heroicons-banknotes" @click="openInvoiceModal(invoice)">
                        Fechar
                      </UButton>

                      <!-- View Invoice -->
                      <UButton v-if="invoice.status === 'CLOSED' || invoice.status === 'PAID'" size="xs" color="neutral"
                        variant="ghost" icon="i-heroicons-document-text"
                        @click="viewInvoice((invoice as any).invoiceId)">
                        Ver Fatura
                      </UButton>

                      <!-- Pending Warning -->
                      <UTooltip v-if="invoice.status === 'PENDING'" text="Resolva as semanas pendentes primeiro">
                        <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-lock-closed" disabled />
                      </UTooltip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </main>

    <!-- Invoice Creation Modal -->
    <InvoiceModal v-if="isModalOpen" v-model="isModalOpen" :data="selectedTeacherForInvoice" :month="selectedDate.month"
      :year="selectedDate.year" @success="handleInvoiceCreated" />
  </div>
</template>
