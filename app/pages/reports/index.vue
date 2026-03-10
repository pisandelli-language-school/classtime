<script setup lang="ts">
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

useHead({
  title: 'Relatórios | ClassTime'
})

const now = new Date()

// Auth and User Context
const user = useSupabaseUser()
const { data: timesheetData } = useFetch('/api/timesheets/current', {
  lazy: true,
  pick: ['userRole'],
  key: 'reports-user-role'
})

const isAdmin = computed(() => {
  const role = (timesheetData.value as any)?.userRole
  return ['ROOT', 'MANAGER', 'ADMIN'].includes(role)
})

// Filters State
const selectedMonth = ref<number>(now.getMonth() + 1)
const selectedYear = ref<number>(now.getFullYear())
const selectedTeacher = ref<string | null>(null)
const selectedStudent = ref<string | null>(null)

// Computed label for year selector Options
const yearOptions = [2024, 2025, 2026]

// Computed Options for Month
const allMonths = Array.from({ length: 12 }, (_, i) => {
  const label = format(new Date(2000, i, 1), 'MMMM', { locale: ptBR })
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: i + 1
  }
})

const monthOptions = computed(() => {
  if (selectedYear.value === now.getFullYear()) {
    return allMonths.filter(m => m.value <= now.getMonth() + 1)
  }
  if (selectedYear.value > now.getFullYear()) {
    return []
  }
  return allMonths
})

// Watch year changes to ensure month is valid
watch(selectedYear, () => {
  const available = monthOptions.value.map(m => m.value)
  if (!available.includes(selectedMonth.value)) {
    if (available.length > 0) {
      selectedMonth.value = Math.max(...available)
    }
  }
})

// Fetch Teachers using /api/admin/users
const { data: usersData, pending: teachersPending, execute: fetchTeachers } = await useFetch('/api/admin/users', {
  lazy: true,
  immediate: false, // We will trigger it manually to ensure isAdmin is evaluated
})

watch(isAdmin, (newVal) => {
  if (newVal && !usersData.value) {
    fetchTeachers()
  }
}, { immediate: true })

const teachersOptions = computed(() => {
  if (!isAdmin.value) {
    return [{ label: (timesheetData.value as any)?.user?.name || 'Eu', value: user.value?.id }]
  }
  const data = usersData.value as any
  const users = data?.users || []
  return users
    .filter((u: any) => u.isTeacher && u.dbId)
    .map((u: any) => ({
      label: u.name,
      value: u.dbId
    }))
})

// If logged in user is not admin, select them by default
watchEffect(() => {
  if (!isAdmin.value && teachersOptions.value.length === 1 && !selectedTeacher.value) {
    const firstTeacher = teachersOptions.value[0]
    if (firstTeacher) {
      selectedTeacher.value = firstTeacher.value
    }
  }
})

// Fetch Filter Options (Subjects)
const { data: filtersData, pending: subjectsPending, refresh: refreshFilters } = await useFetch('/api/reports/filters', {
  query: computed(() => ({
    teacherId: selectedTeacher.value
  })),
  watch: [selectedTeacher]
})

const subjectsOptions = computed(() => {
  return (filtersData.value?.subjects || []).map((s: any) => ({
    label: s.name,
    value: s.id
  }))
})

// Search State
const isSearching = ref(false)

// Fetch Data
const { data: reportsData, execute: executeSearch, pending: isFetching, error } = await useFetch('/api/reports/time-entries', {
  immediate: false, // Don't fetch on mount until requested (or you can do immediate if you want default)
  query: computed(() => ({
    month: selectedMonth.value,
    year: selectedYear.value,
    teacherId: selectedTeacher.value,
    subjectId: selectedStudent.value
  }))
})

const handleSearch = () => {
  isSearching.value = true
  executeSearch()
}

const entries = computed(() => reportsData.value?.data || [])

// Utility formatting
const formatDate = (d: string | Date | undefined) => {
  if (!d) return '-'
  try {
    return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR })
  } catch (e) {
    return '-'
  }
}

const print = () => {
  window.print()
}

// Current period label for PDF Header
const currentPeriodLabel = computed(() => {
  const m = allMonths.find(opt => opt.value === selectedMonth.value)
  return `${m?.label || ''} de ${selectedYear.value}`
})

// Selected labels for PDF
const selectedTeacherLabel = computed(() => {
  if (!selectedTeacher.value) return 'Todos os Professores'
  const t = teachersOptions.value.find((opt: any) => opt.value === selectedTeacher.value)
  return t ? t.label : 'Carregando...'
})

const selectedStudentLabel = computed(() => {
  if (!selectedStudent.value) return 'Todas as Turmas/Alunos'
  const s = subjectsOptions.value.find((opt: any) => opt.value === selectedStudent.value)
  return s ? s.label : 'Carregando...'
})

</script>

<template>
  <div
    class="h-full bg-slate-50 dark:bg-slate-900 p-8 overflow-auto print:p-0 print:bg-white print:dark:bg-white print:overflow-visible">

    <!-- Header Actions (Hidden on Print) -->
    <div class="flex justify-between items-center mb-6 print:hidden">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Relatórios de Aulas</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Consulte relatórios mensais de aulas por professor e
          aluno.</p>
      </div>
      <div>
        <UButton v-if="entries.length > 0" icon="i-heroicons-printer" color="primary" @click="print">
          Imprimir / PDF
        </UButton>
      </div>
    </div>

    <!-- Filters (Hidden on Print) -->
    <UCard class="mb-6 print:hidden">
      <div class="flex flex-col md:flex-row gap-4 items-start md:items-end">

        <!-- Year -->
        <div class="w-full md:w-32">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ano</label>
          <div class="relative w-full">
            <select v-model="selectedYear"
              class="outline-none focus:outline-none appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all cursor-pointer">
              <option v-for="y in yearOptions" :key="y" :value="y">
                {{ y }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <span class="material-symbols-outlined text-lg">expand_more</span>
            </div>
          </div>
        </div>

        <!-- Month -->
        <div class="w-full md:w-48">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mês</label>
          <div class="relative w-full">
            <select v-model="selectedMonth"
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

        <!-- Teacher Filter (Only for Admin) -->
        <div v-if="isAdmin" class="w-full md:w-64">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Professor</label>
          <div class="relative w-full">
            <select v-model="selectedTeacher" :disabled="teachersPending"
              class="outline-none focus:outline-none appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait">
              <option v-if="teachersPending" :value="null" disabled>Carregando professores...</option>
              <option v-else :value="null">Todos os Professores</option>
              <option v-for="opt in teachersOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <UIcon v-if="teachersPending" name="i-heroicons-arrow-path" class="animate-spin text-sm" />
              <span v-else class="material-symbols-outlined text-lg">expand_more</span>
            </div>
          </div>
        </div>

        <!-- Student Filter -->
        <div class="w-full md:w-64">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aluno / Turma</label>
          <div class="relative w-full">
            <select v-model="selectedStudent" :disabled="subjectsPending"
              class="outline-none focus:outline-none appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-[#0984e3] sm:text-sm sm:leading-6 bg-white dark:bg-slate-900 dark:ring-slate-700 dark:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait">
              <option v-if="subjectsPending" :value="null" disabled>Carregando turmas...</option>
              <option v-else :value="null">Selecione uma turma/aluno...</option>
              <option v-for="opt in subjectsOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <UIcon v-if="subjectsPending" name="i-heroicons-arrow-path" class="animate-spin text-sm" />
              <span v-else class="material-symbols-outlined text-lg">expand_more</span>
            </div>
          </div>
        </div>

        <!-- Search Button -->
        <div>
          <UButton icon="i-heroicons-magnifying-glass" color="primary" :loading="isFetching" @click="handleSearch"
            :disabled="!selectedStudent" title="Selecione um aluno para buscar">
            Buscar
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Content / Print View -->
    <div v-if="isSearching"
      class="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden print:shadow-none print:rounded-none print:bg-white border border-slate-200 dark:border-slate-700">

      <!-- Loading State -->
      <div v-if="isFetching" class="p-8 flex justify-center print:hidden">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center text-red-500 print:hidden">
        <p class="font-bold">Erro ao carregar dados do relatório.</p>
        <UButton @click="handleSearch" variant="soft" color="error" class="mt-4" size="sm">Tentar Novamente</UButton>
      </div>

      <!-- Empty State -->
      <div v-else-if="entries.length === 0" class="p-12 text-center text-slate-400 print:hidden">
        <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl mb-2 opacity-50" />
        <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
      </div>

      <!-- Results view (Document format) -->
      <div v-else class="p-8 print:p-8 text-slate-900 border-none print:border-none">

        <!-- Print Header -->
        <div class="flex justify-between items-start mb-8 hidden print:flex">
          <div>
            <img src="/logo-pisa.png" alt="ClassTime Logo" class="w-[180px] h-auto mb-2" />
            <div class="text-sm text-slate-500 font-bold uppercase tracking-wider">Relatório de Atividades</div>
          </div>
          <div class="text-right">
            <div class="mt-2 text-sm text-slate-500">Data de Emissão</div>
            <div>{{ formatDate(now) }}</div>
          </div>
        </div>

        <!-- Context Meta (Visible on both UI and Print) -->
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b-2 border-slate-100 pb-6 print:grid-cols-3 dark:border-slate-700 print:border-slate-200">
          <div>
            <h3
              class="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-2 print:text-slate-500">
              Aluno / Turma</h3>
            <div class="text-lg font-bold dark:text-white print:text-black">{{ selectedStudentLabel }}</div>
          </div>
          <div>
            <h3
              class="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-2 print:text-slate-500">
              Professor Responsável</h3>
            <div class="text-lg font-bold dark:text-white print:text-black">{{ selectedTeacherLabel }}</div>
          </div>
          <div class="md:text-right print:text-right">
            <h3
              class="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-2 print:text-slate-500">
              Período Selecionado</h3>
            <div class="text-lg font-bold capitalize dark:text-white print:text-black">
              {{ currentPeriodLabel }}
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto print:overflow-hidden">
          <table class="w-full mb-12 text-sm text-left align-top">
            <thead>
              <tr class="border-b-2 border-slate-200 dark:border-slate-700 print:border-slate-300">
                <th class="py-3 font-bold text-slate-500 uppercase">Data</th>
                <th class="py-3 font-bold text-slate-500 uppercase">Duração (hrs)</th>
                <th class="py-3 font-bold text-slate-500 uppercase">Tipo</th>
                <th class="py-3 font-bold text-slate-500 uppercase">Descrição / Obs</th>
                <th class="py-3 font-bold text-slate-500 uppercase">Presença</th>
              </tr>
            </thead>
            <tbody
              class="text-slate-700 dark:text-slate-300 print:text-black divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
              <tr v-for="entry in entries" :key="entry.id">
                <td class="py-4 font-medium">{{ formatDate(entry.date) }}</td>
                <td class="py-4">{{ Number(entry.duration).toFixed(1) }}h</td>
                <td class="py-4">
                  <UBadge variant="soft" :color="entry.type === 'Falta' ? 'error' : 'primary'">
                    {{ entry.type }}
                  </UBadge>
                </td>
                <td class="py-4 max-w-sm">
                  <p class="font-bold mb-1 dark:text-white print:text-black">{{ entry.description }}</p>
                  <p class="text-slate-500 dark:text-slate-400 text-xs italic line-clamp-2 print:line-clamp-none">{{
                    entry.observations || 'Nenhuma observação.' }}</p>
                </td>
                <td class="py-4">
                  <div class="flex flex-wrap gap-1">
                    <span v-for="student in entry.attendees" :key="student.id"
                      class="text-xs bg-slate-100 dark:bg-slate-700 print:bg-slate-100 print:border px-2 py-1 rounded">
                      {{ student.name }}
                    </span>
                    <span v-if="entry.attendees.length === 0" class="text-xs text-slate-400 italic">
                      Nenhum (Falta)
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="text-center text-slate-400 text-sm mt-12 pt-8 border-t border-slate-100 print:block hidden">
          <p>ClassTime System • Gerado em {{ formatDate(new Date()) }}</p>
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
    background-color: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
