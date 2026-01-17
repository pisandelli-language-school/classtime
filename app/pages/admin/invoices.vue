<script setup lang="ts">
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const now = new Date()
const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const label = format(new Date(2000, i, 1), 'MMMM', { locale: ptBR })
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: i + 1
  }
})

// Initial State Logic: Default to previous month if early in current month (<= 10th)
const getInitialState = () => {
  // Check if we are early in the month (e.g., 10th or before)
  if (now.getDate() <= 10) {
    // Go back one month
    const prev = subMonths(now, 1)
    return {
      month: prev.getMonth() + 1,
      year: prev.getFullYear()
    }
  }
  // Otherwise current month
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  }
}

const selectedDate = ref<{ month: number; year: number }>(getInitialState())

const currentPeriodLabel = computed(() => {
  const m = monthOptions.find(opt => opt.value === selectedDate.value.month)
  return `${m?.label || ''} de ${selectedDate.value.year}`
})

const { data: invoicesData, refresh, pending, error } = await useFetch('/api/admin/invoices', {
  query: computed(() => ({
    month: selectedDate.value.month,
    year: selectedDate.value.year
  }))
})

const invoices = computed(() => invoicesData.value?.data || [])

const totalMonthlyAmount = computed(() => {
  return invoices.value.reduce((sum, inv) => sum + (Number((inv.summary as any)?.amount) || 0), 0)
})

const isModalOpen = ref(false)
const selectedTeacherForInvoice = ref<any>(null)

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const getGoalPercentage = (worked: number, expected: number) => {
  if (!expected) return 0
  return Math.min((worked / expected) * 100, 100)
}

const getProgressBarColor = (percentage: number) => {
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 66) return 'bg-blue-500'
  if (percentage >= 33) return 'bg-orange-500'
  return 'bg-red-500'
}

const getStatusColor = (status: string) => {
  if (status === 'READY') return 'success'
  if (status === 'PENDING') return 'error'
  if (status === 'CLOSED') return 'info'
  if (status === 'PAID') return 'neutral'
  return 'neutral'
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
  <div class="p-8 space-y-6">

    <!-- Top Bar -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Fechamento de Folha</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Gerencie faturas e pagamentos mensais.</p>
      </div>

    </div>

    <!-- Content -->
    <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } as any }">
      <template #header>
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-center relative">
          <!-- Left: Filters -->
          <div class="flex items-center gap-2 z-10">
            <!-- Year Selector -->
            <USelectMenu v-model="selectedDate.year" :options="[2024, 2025, 2026]" class="w-24" />

            <!-- Month Selector (Native) -->
            <div class="relative w-40">
              <select v-model="selectedDate.month"
                class="outline-none focus:outline-none capitalize appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all cursor-pointer">
                <option v-for="m in monthOptions" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <span class="material-symbols-outlined text-lg">expand_more</span>
              </div>
            </div>
          </div>

          <!-- Center: Title (Absolute on desktop, relative on mobile) -->
          <div
            class="sm:absolute sm:left-1/2 sm:-translate-x-1/2 text-center pointer-events-none flex flex-col items-center">
            <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Faturamento</span>
            <span class="text-lg font-bold text-slate-900 dark:text-white">{{ currentPeriodLabel }}</span>
          </div>


        </div>
      </template>

      <!-- ClientOnly for Table to avoid hydration mismatch -->
      <ClientOnly>
        <!-- Loading State -->
        <div v-if="pending" class="p-8 flex justify-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8 text-center text-red-500">
          <p class="font-bold">Erro ao carregar dados</p>
          <UButton @click="() => refresh()" variant="soft" color="error" class="mt-4" size="sm">Tentar Novamente
          </UButton>
        </div>

        <!-- Empty State -->
        <div v-else-if="invoices.length === 0" class="p-12 text-center text-slate-400">
          <UIcon name="i-heroicons-users" class="text-4xl mb-2 opacity-50" />
          <p>Nenhum professor encontrado para este período.</p>
        </div>

        <!-- Custom Table -->
        <div v-else class="overflow-x-auto overflow-y-auto custom-scrollbar">
          <table class="w-full text-sm text-left relative">
            <thead
              class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th class="px-6 py-3">Professor</th>
                <th class="px-6 py-3 min-w-[200px]">Horas (Aprovado / Meta)</th>
                <th class="px-6 py-3">Valor Est.</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="invoice in invoices" :key="invoice.teacher.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50 dark:even:bg-slate-800/30">
                <!-- Teacher -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <UAvatar :src="(invoice.teacher as any).avatar || undefined"
                      :alt="invoice.teacher.name || undefined" size="sm" />
                    <span class="font-medium text-slate-900 dark:text-white">{{ invoice.teacher.name }}</span>
                  </div>
                </td>

                <!-- Hours -->
                <td class="px-6 py-4">
                  <div class="w-full max-w-[200px]">
                    <div class="flex justify-between items-end mb-1">
                      <span class="font-bold text-slate-900 dark:text-white text-sm">
                        {{ Number(invoice.summary?.totalHours || 0).toFixed(1) }}h
                      </span>
                      <span class="text-xs text-slate-400">
                        / {{ Number((invoice.summary as any)?.expectedHours || 0).toFixed(0) }}h
                      </span>
                    </div>
                    <div class="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500"
                        :class="getProgressBarColor(getGoalPercentage(Number(invoice.summary?.totalHours || 0), Number((invoice.summary as any)?.expectedHours || 0)))"
                        :style="{ width: `${getGoalPercentage(Number(invoice.summary?.totalHours || 0), Number((invoice.summary as any)?.expectedHours || 0))}%` }">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Amount -->
                <td class="px-6 py-4">
                  <span class="font-mono text-slate-600 dark:text-slate-400">
                    {{ formatCurrency(Number(invoice.summary?.amount || 0)) }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <UBadge :color="getStatusColor(invoice.status)" variant="soft" size="md">
                      {{ getStatusLabel(invoice.status) }}
                    </UBadge>
                    <span v-if="(invoice as any).missingApprovals > 0" class="text-xs text-red-500">
                      ({{ (invoice as any).missingApprovals }} pend)
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right">
                  <!-- Create Invoice -->
                  <UButton v-if="invoice.status === 'READY'" size="xs" color="primary" variant="solid"
                    icon="i-heroicons-banknotes" @click="openInvoiceModal(invoice)">
                    Fechar
                  </UButton>

                  <!-- View Invoice -->
                  <UButton v-if="invoice.status === 'CLOSED' || invoice.status === 'PAID'" size="xs" color="neutral"
                    variant="ghost" icon="i-heroicons-document-text" @click="viewInvoice((invoice as any).invoiceId)">
                    Ver Fatura
                  </UButton>

                  <!-- Pending Warning -->
                  <UTooltip v-if="invoice.status === 'PENDING'" text="Resolva as semanas pendentes primeiro">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-lock-closed" disabled />
                  </UTooltip>
                </td>
              </tr>
            </tbody>
            <tfoot
              class="sticky bottom-0 z-10 font-bold bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <tr>
                <td colspan="2" class="px-6 py-4 text-right text-xs uppercase tracking-wider text-slate-500">
                  Total Previsto da Folha:
                </td>
                <td class="px-6 py-4 font-mono text-base">
                  {{ formatCurrency(totalMonthlyAmount) }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ClientOnly>
    </UCard>

    <!-- Invoice Creation Modal -->
    <InvoiceModal v-if="isModalOpen" v-model="isModalOpen" :data="selectedTeacherForInvoice" :month="selectedDate.month"
      :year="selectedDate.year" @success="handleInvoiceCreated" />
  </div>
</template>
