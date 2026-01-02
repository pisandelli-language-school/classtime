<script setup lang="ts">
const { data: contractsData, pending, error, refresh } = useFetch('/api/admin/contracts', { lazy: true })

const search = ref('')
const selectedType = ref<string | null>(null) // null = All
const selectedTeacherId = ref<string | null>(null)
const isModalOpen = ref(false)
const selectedContract = ref<any>(null) // If null, create new mode

const usersStore = useUsersStore()
const { teachers } = storeToRefs(usersStore)

onMounted(() => {
  usersStore.fetchUsers()
})

const typeOptions = [
  { label: 'Todos', value: null },
  { label: 'Turmas', value: 'Turma' },
  { label: 'Alunos', value: 'Aluno' }
]

const filteredContracts = computed(() => {
  const data = contractsData.value
  if (!data || !data.success || !('contracts' in data)) return []

  let contracts = (data as any).contracts

  // Search Filter
  if (search.value) {
    const q = search.value.toLowerCase()
    contracts = contracts.filter((c: any) =>
      c.subjectName?.toLowerCase().includes(q)
    )
  }

  // Type Filter
  if (selectedType.value) {
    contracts = contracts.filter((c: any) => c.type === selectedType.value)
  }

  // Teacher Filter
  if (selectedTeacherId.value) {
    contracts = contracts.filter((c: any) => c.teacher?.id === selectedTeacherId.value)
  }

  return contracts
})

const handleEdit = (contract: any) => {
  selectedContract.value = contract
  isModalOpen.value = true
}

const handleCreate = () => {
  selectedContract.value = null
  isModalOpen.value = true
}

// Heat Scale Color Logic
const getProgressColor = (percent: number) => {
  if (percent >= 100) return 'bg-red-500' // Finished
  if (percent >= 90) return 'bg-red-500' // Critical (>90% consumed)
  if (percent >= 75) return 'bg-orange-500' // Warning
  if (percent >= 50) return 'bg-yellow-500' // Halfway
  return 'bg-green-500' // Safe
}

// Date Formatting
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}
</script>

<template>
  <div class="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
      <div class="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Gerenciar Contratos</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Acompanhe o consumo de horas e renove contratos.</p>
        </div>
        <button @click="handleCreate"
          class="px-6 py-2 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer active:scale-95">
          <UIcon name="i-heroicons-plus" class="text-lg" />
          Novo Contrato
        </button>
      </div>
    </div>

    <!-- Filters & Content -->
    <main class="flex-1 overflow-auto p-6 min-h-0">
      <div class="max-w-[1600px] mx-auto w-full h-full flex flex-col gap-6">

        <!-- Search & Filter Bar -->
        <UCard :ui="{ body: { padding: 'p-4 sm:p-4' } as any }">
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div class="flex-1 w-full sm:w-auto">
              <UInput v-model="search" icon="i-heroicons-magnifying-glass" placeholder="Buscar por Nome..."
                class="w-full" />
            </div>

            <div class="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <!-- Type Filter (Button Group) -->
              <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
                <button v-for="opt in typeOptions" :key="opt.label" @click="selectedType = opt.value"
                  class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors" :class="selectedType === opt.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">
                  {{ opt.label }}
                </button>
              </div>

              <!-- Teacher Filter (Native Select) -->
              <div class="relative w-full sm:w-64">
                <select v-model="selectedTeacherId"
                  class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  <option :value="null">Todos os Professores</option>
                  <option v-for="teacher in teachers" :key="teacher.dbId" :value="teacher.dbId">
                    {{ teacher.name }}
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span class="material-symbols-outlined text-lg">expand_more</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Contracts Table -->
        <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } as any }" class="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div class="overflow-auto min-h-0 h-full">
            <!-- Pending State -->
            <div v-if="pending" class="flex justify-center items-center py-20">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-[#0984e3]" />
            </div>

            <!-- Empty State -->
            <div v-else-if="!filteredContracts.length"
              class="flex flex-col items-center justify-center py-20 text-slate-400">
              <UIcon name="i-heroicons-document-text" class="text-4xl mb-2" />
              <p>Nenhum contrato encontrado.</p>
            </div>

            <!-- Table -->
            <table v-else class="w-full text-left text-sm whitespace-nowrap">
              <thead
                class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="px-6 py-3">Nome / Tipo</th>
                  <th class="px-6 py-3">Professor</th>
                  <th class="px-6 py-3">Horas Totais</th>
                  <th class="px-6 py-3">Consumo</th>
                  <th class="px-6 py-3">Datas</th>
                  <th class="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="contract in filteredContracts" :key="contract.id"
                  class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

                  <!-- Name & Type -->
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="font-medium text-slate-900 dark:text-white">{{ contract.subjectName }}</span>
                      <div class="mt-1">
                        <UBadge :color="contract.type === 'Turma' ? 'primary' : 'secondary'" variant="subtle" size="sm">
                          {{ contract.type }}
                        </UBadge>
                      </div>
                    </div>
                  </td>

                  <!-- Teacher -->
                  <td class="px-6 py-4">
                    <div v-if="contract.teacher" class="flex items-center gap-2">
                      <UAvatar :src="contract.teacher.avatar || undefined" :alt="contract.teacher.name" size="xs" />
                      <span class="text-slate-700 dark:text-slate-300">{{ contract.teacher.name }}</span>
                    </div>
                    <span v-else class="text-slate-400 text-xs italic">Sem professor</span>
                  </td>

                  <!-- Total / Weekly -->
                  <td class="px-6 py-4 text-slate-500">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-slate-900 dark:text-white font-medium">{{ contract.totalHours }}h Totais</span>
                      <span class="text-xs">{{ contract.weeklyHours }}h / semana</span>
                    </div>
                  </td>

                  <!-- Consumption (Heat Scale) -->
                  <td class="px-6 py-4 w-64">
                    <div class="flex flex-col gap-1.5">
                      <div class="flex justify-between text-xs font-medium">
                        <span
                          :class="{ 'text-red-500': contract.progress >= 90, 'text-slate-600': contract.progress < 90 }">
                          {{ contract.consumedHours.toFixed(1) }}h usadas
                        </span>
                        <span class="text-slate-400">{{ contract.remainingHours.toFixed(1) }}h restantes</span>
                      </div>
                      <div class="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                          :class="getProgressColor(contract.progress)"
                          :style="{ width: `${Math.min(contract.progress, 100)}%` }">
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Dates -->
                  <td class="px-6 py-4 text-slate-500">
                    <div class="flex flex-col gap-0.5 text-xs">
                      <div class="flex gap-2">
                        <span class="w-12 text-slate-400">Início:</span>
                        <span class="font-medium text-slate-700 dark:text-slate-300">{{ formatDate(contract.startDate)
                        }}</span>
                      </div>
                      <div class="flex gap-2">
                        <span class="w-12 text-slate-400">Previsão:</span>
                        <span class="font-medium text-slate-700 dark:text-slate-300">{{
                          formatDate(contract.predictedEndDate) }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 text-right">
                    <UButton color="neutral" variant="ghost" icon="i-heroicons-pencil-square"
                      @click="handleEdit(contract)" class="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                      Editar
                    </UButton>
                  </td>

                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </main>

    <!-- Modal -->
    <ContractEditModal v-if="isModalOpen" v-model="isModalOpen" :contract="selectedContract" @refresh="refresh" />
  </div>
</template>
