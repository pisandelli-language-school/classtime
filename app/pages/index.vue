<script setup lang="ts">
import { setISOWeek, setYear, startOfISOWeek } from 'date-fns'
const usersStore = useUsersStore()
const { teachers, isLoading: isLoadingTeachers } = storeToRefs(usersStore)

const route = useRoute()
const currentReferenceDate = useState<Date>('timesheet-ref-date', () =>
  route.query.date ? new Date(route.query.date as string) : new Date()
)

watch(() => route.query.date, (newDate) => {
  if (newDate) currentReferenceDate.value = new Date(newDate as string)
})

const selectedTeacherContext = ref<string | undefined>(undefined)

const { data: timesheetData, refresh, pending } = useFetch('/api/timesheets/current', {
  lazy: true,
  query: {
    teacherEmail: selectedTeacherContext,
    month: computed(() => currentReferenceDate.value.getMonth() + 1),
    year: computed(() => currentReferenceDate.value.getFullYear()),
    date: computed(() => currentReferenceDate.value.toISOString())
  },
  watch: [selectedTeacherContext, currentReferenceDate]
})

const canImpersonate = computed(() => {
  const role = (timesheetData.value as any)?.userRole
  return role === 'ROOT' || role === 'MANAGER'
})

// Fetch teachers if admin
watch(canImpersonate, (isAllowed) => {
  if (isAllowed) {
    usersStore.fetchUsers()
  }
}, { immediate: true })

const isModalOpen = ref(false)
const isAuditDrawerOpen = ref(false)
const isPendingActionsOpen = ref(false)
const selectedDate = ref('')

const timesheet = computed(() => timesheetData.value?.timesheet)
const assignments = computed(() => timesheetData.value?.assignments || [])
const entries = computed(() => timesheet.value?.entries || [])
const monthlyExpectedHours = computed(() => (timesheetData.value as any)?.user?.monthlyExpectedHours || 0)
const monthlyWorkedHours = computed(() => {
  // Use server-side aggregated total if available, fallback to 0
  return Number((timesheetData.value as any)?.user?.monthlyWorkedHours || 0)
})

const goalPercentage = computed(() => {
  if (!monthlyExpectedHours.value) return 0
  return Math.min((monthlyWorkedHours.value / monthlyExpectedHours.value) * 100, 100)
})

const goalColorClass = computed(() => {
  if (goalPercentage.value >= 100) return 'bg-green-500' // Goal Met
  if (goalPercentage.value >= 66) return 'bg-blue-500'   // Good Progress
  if (goalPercentage.value >= 33) return 'bg-orange-500' // Warming Up
  return 'bg-red-500'                                    // Cold / Just Started
})

const hasAssignments = computed(() => assignments.value.length > 0)
const showAdminPlaceholder = computed(() => canImpersonate.value && !selectedTeacherContext.value && !hasAssignments.value)

const selectedEntry = ref<any>(undefined)

const handleLogTime = (date: string) => {
  selectedDate.value = date
  selectedEntry.value = undefined
  isModalOpen.value = true
}

// Filter State
const filterType = ref<string | undefined>(undefined)
const filterSubject = ref<string | undefined>(undefined)
const isFilterOpen = ref(false)

const filteredEntries = computed(() => {
  return entries.value.filter(entry => {
    // Filter by Type
    if (filterType.value && entry.type !== filterType.value) return false

    // Filter by Subject (Assignment ID)
    if (filterSubject.value && (entry.assignmentId !== filterSubject.value && entry.assignment?.id !== filterSubject.value)) return false

    return true
  })
})

const handleEditEntry = (entry: any) => {
  selectedDate.value = entry.date

  // Create a mutable copy and populate times
  const entryData = { ...entry }

  if (entry.date) {
    const d = new Date(entry.date)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    entryData.startTime = `${hours}:${minutes}`

    // Calculate end time
    const endD = new Date(d.getTime() + Number(entry.duration) * 60 * 60 * 1000)
    const endH = String(endD.getHours()).padStart(2, '0')
    const endM = String(endD.getMinutes()).padStart(2, '0')
    entryData.endTime = `${endH}:${endM}`
  }

  selectedEntry.value = entryData
  isModalOpen.value = true
}



const handleSaveEntry = async (entry: any) => {
  const loader = useLoader()
  loader.startLoading('Salvando...')

  try {
    // 1. Construct Date object with time
    let dateObj = new Date(entry.date)
    if (entry.startTime) {
      const [hours, minutes] = entry.startTime.split(':').map(Number)
      dateObj.setHours(hours, minutes, 0, 0)
    }

    const payload = {
      id: entry.id,
      timesheetId: timesheet.value?.id,
      date: dateObj.toISOString(),
      duration: Number(entry.hours),
      assignmentId: entry.subject?.id || entry.subject, // Handle object or ID
      description: entry.description,
      observations: entry.observations,
      type: entry.type,
      attendeeIds: entry.attendeeIds
    }

    await $fetch('/api/timesheets/entries', {
      method: 'POST',
      body: payload
    })

    await refresh() // Refresh data to show new entry
    isModalOpen.value = false // Close modal only on success
  } catch (error) {
    console.error('Failed to save entry:', error)
    // alert('Failed to save entry') // Optional user feedback
  } finally {
    loader.stopLoading()
  }
}

const handleDeleteEntry = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir este lançamento?')) return

  const loader = useLoader()
  loader.startLoading('Excluindo...')

  try {
    await $fetch('/api/timesheets/entries', {
      method: 'DELETE',
      query: { id }
    })

    await refresh()
    isModalOpen.value = false
  } catch (error) {
    console.error('Failed to delete entry:', error)
    alert('Erro ao excluir lançamento. Verifique se a folha já foi enviada.')
  } finally {
    loader.stopLoading()
  }
}

// ...

// Update Template to bind :loading
// Find where <TimesheetModal> is used



// --- Weekly Status & Approval ---
const { data: weeklyStatusData, refresh: refreshStatus } = useFetch('/api/timesheets/weekly-status', {
  query: {
    date: computed(() => currentReferenceDate.value.toISOString()),
    teacherEmail: selectedTeacherContext
  },
  watch: [currentReferenceDate, selectedTeacherContext]
})

const weeklyStatus = computed(() => (weeklyStatusData.value as any)?.status || 'PENDING')
const rejectionReason = computed(() => (weeklyStatusData.value as any)?.rejectionReason)

const isWeekLocked = computed(() => {
  return weeklyStatus.value === 'SUBMITTED' || weeklyStatus.value === 'APPROVED'
})

const submitWeek = async () => {
  if (!confirm('Deseja enviar a semana para aprovação? Você não poderá alterar os lançamentos após o envio.')) return

  const loader = useLoader()
  const toast = useToast()

  loader.startLoading('Enviando...')

  try {
    await $fetch('/api/timesheets/submit-week', {
      method: 'POST',
      body: {
        date: currentReferenceDate.value,
        teacherEmail: selectedTeacherContext.value
      }
    })

    // Force refresh of status, data, and pending actions
    await Promise.all([
      refreshStatus(),
      refresh(),
      refreshPendingActions()
    ])

    // Explicitly update computed property trigger if needed
    // But refreshStatus should handle it.

    toast.add({
      title: 'Semana Enviada!',
      description: 'Sua folha de pontos foi enviada para aprovação.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })

  } catch (e: any) {
    toast.add({
      title: 'Erro ao enviar',
      description: e.message || 'Ocorreu um erro ao enviar a semana.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loader.stopLoading()
  }
}




const navigateWeek = (offset: number) => {
  const newDate = new Date(currentReferenceDate.value)
  newDate.setDate(newDate.getDate() + (offset * 7))
  currentReferenceDate.value = newDate
}

const jumpToToday = () => {
  currentReferenceDate.value = new Date()
}

const isCurrentWeek = computed(() => {
  const today = new Date()
  const start = weekDays.value[0]
  const end = weekDays.value[6]

  if (!start || !end) return false

  return today >= start && today <= end
})

// --- Pending Actions Notification ---
const { data: pendingActionsData, refresh: refreshPendingActions } = useFetch('/api/timesheets/pending-actions', {
  lazy: true,
  query: {
    teacherEmail: selectedTeacherContext
  },
  watch: [selectedTeacherContext] // Refresh when context changes (or maybe periodically?)
})

const pendingActions = computed(() => (pendingActionsData.value as any)?.actions || [])

const jumpToWeek = (year: number, week: number) => {
  // Robust Date Calculation using date-fns
  // 1. Set Year
  // 2. Set ISO Week
  // 3. Get Start of that ISO Week
  // 4. Ensure Monday
  const date = startOfISOWeek(setISOWeek(setYear(new Date(), year), week))

  // Update reference date
  currentReferenceDate.value = date
}

const pendingActionItems = computed(() => {
  if (pendingActions.value.length === 0) return []

  // Transform actions into Dropdown items (Array of Arrays)
  return [
    pendingActions.value.map((action: any) => ({
      label: action.label,
      icon: action.type === 'REJECTED' ? 'i-heroicons-x-circle' : 'i-heroicons-clock',
      click: () => jumpToWeek(action.year, action.week),
      // Optional: styling
      class: action.type === 'REJECTED' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
      description: action.type === 'REJECTED' ? (action.reason || 'Sem motivo') : 'Não enviada'
    }))
  ]
})

const viewTitle = computed(() => {
  if (!weekDays.value || !weekDays.value.length) return ''
  const start = weekDays.value[0]
  if (!start) return ''
  // Return Month + Year, e.g. "Dezembro 2025"
  return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const weekDays = computed(() => {
  const curr = new Date(currentReferenceDate.value)
  const day = curr.getDay()
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(curr.setDate(diff))
  monday.setHours(0, 0, 0, 0) // Normalize time for Monday

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    d.setHours(0, 0, 0, 0) // Normalize time for each day
    days.push(d)
  }
  return days
})


const entriesByDay = computed(() => {
  const map: Record<string, any[]> = {}

  if (!filteredEntries.value) return map

  for (const entry of filteredEntries.value) {
    if (!entry.date) continue
    // Normalize date string to YYYY-MM-DD for grouping
    // We use the date string directly if it's already ISO, or parse it
    const parts = String(entry.date).split('T')
    const dateStr = parts[0]
    if (!dateStr) continue

    if (!map[dateStr]) map[dateStr] = []
    map[dateStr]!.push(entry)
  }
  return map
})

const getEntriesForDay = (date: Date) => {
  // Construct YYYY-MM-DD key from the day object
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const key = `${y}-${m}-${d}`

  return entriesByDay.value[key] || []
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' })
}
const headerDateRange = computed(() => {
  if (!weekDays.value || weekDays.value.length < 7) return ''
  const start = weekDays.value[0]
  const end = weekDays.value[6]

  if (!start || !end) return ''

  return `${start.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const getEntryTypeColor = (type?: string) => {
  switch (type) {
    case 'Normal':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'Reposição':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'Cancelamento':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'Aula Demonstrativa':
    case 'Master Class':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  }
}

const getEntryTimeRange = (entry: any) => {
  if (!entry.date || !entry.duration) return ''
  const start = new Date(entry.date)
  const end = new Date(start.getTime() + Number(entry.duration) * 60 * 60 * 1000)

  const format = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  return `${format(start)} - ${format(end)}`
}
</script>

<template>
  <div class="h-full flex flex-col min-h-0 relative">
    <!-- Loading Overlay -->
    <div v-if="pending"
      class="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-[#0984e3]" />
    </div>

    <!-- Admin Toolbar -->
    <div v-if="canImpersonate" class="flex-none bg-indigo-950 border-b border-indigo-900 z-40 relative">
      <ClientOnly>
        <div class="max-w-[1600px] mx-auto w-full flex items-center justify-between gap-4 px-4 py-2">

          <!-- Context Selector -->
          <div class="flex items-center gap-3">
            <div class="w-64 relative">
              <select v-model="selectedTeacherContext" :disabled="isLoadingTeachers"
                class="appearance-none block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-white bg-indigo-900/50 shadow-sm ring-1 ring-inset ring-indigo-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all cursor-pointer font-medium hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-wait">
                <option v-if="isLoadingTeachers" :value="undefined" disabled>Carregando professores...</option>
                <option :value="undefined">Minha Visão</option>
                <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.email">
                  Ver: {{ teacher.name }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-300">
                <UIcon v-if="isLoadingTeachers" name="i-heroicons-arrow-path" class="animate-spin text-sm" />
                <span v-else class="material-symbols-outlined text-sm">visibility</span>
              </div>
            </div>

            <div v-if="selectedTeacherContext"
              class="flex items-center gap-1.5 text-xs text-indigo-200 bg-indigo-800 px-3 py-1.5 rounded-full border border-indigo-700/50 shadow-sm">
              <span class="material-symbols-outlined text-[16px]">info</span>
              <span class="font-medium">Visualizando como <strong class="text-white">{{teachers.find(t => t.email ===
                selectedTeacherContext)?.name}}</strong></span>
            </div>
          </div>

          <!-- History Button -->
          <button v-if="selectedTeacherContext" @click="() => { isAuditDrawerOpen = true; }"
            class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-700 text-xs font-medium text-indigo-100 hover:text-white transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-sm">history</span>
            <span>Histórico</span>
          </button>

        </div>
      </ClientOnly>
    </div>
    <!-- Secondary Header / Controls -->
    <div class="flex-none border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div class="max-w-[1600px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4">


        <!-- Date Navigation (Hide on Admin Placeholder) -->
        <div v-if="!showAdminPlaceholder"
          class="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 pl-4 pr-1 shadow-sm">
          <span class="text-sm font-bold whitespace-nowrap text-slate-700 dark:text-slate-200">{{ headerDateRange
            }}</span>
          <div class="flex gap-1">
            <button @click="navigateWeek(-1)"
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button @click="navigateWeek(1)"
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Filter Controls (Hide on Admin Placeholder) -->
        <div v-if="!showAdminPlaceholder" class="relative z-30">


          <button @click="isFilterOpen = !isFilterOpen"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
            <span class="material-symbols-outlined text-sm">filter_list</span>
            <span v-if="filterType || filterSubject" class="text-[#0984e3]">Filtros Ativos</span>
            <span v-else>Filtrar</span>
          </button>

          <!-- Dropdown Panel -->
          <div v-if="isFilterOpen"
            class="absolute top-full left-0 mt-2 p-4 w-72 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm">Filtrar Lançamentos</h3>
              <div class="flex gap-2">
                <button v-if="filterType || filterSubject"
                  @click="{ filterType = undefined; filterSubject = undefined }"
                  class="text-xs text-red-500 hover:text-red-600 font-medium">
                  Limpar
                </button>
                <button @click="isFilterOpen = false" class="text-xs text-slate-400 hover:text-slate-600">
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select v-model="filterType"
                  class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
                  <option :value="undefined">Todos os Tipos</option>
                  <option value="Normal">Normal</option>
                  <option value="Reposição">Reposição</option>
                  <option value="Cancelamento">Cancelamento</option>
                  <option value="Aula Demonstrativa">Aula Demonstrativa</option>
                  <option value="Master Class">Master Class</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Turma / Aluno</label>
                <select v-model="filterSubject"
                  class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#0984e3] sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
                  <option :value="undefined">Todos</option>
                  <option v-for="opt in (assignments || [])" :key="opt.id" :value="opt.id">
                    {{ opt.class?.name || opt.student?.name || 'Sem Nome' }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Click Outside Overlay -->
          <div v-if="isFilterOpen" @click="isFilterOpen = false" class="fixed inset-0 z-[-1]" />
        </div>

        <!-- Dynamic Header Center (Hide on Admin Placeholder) -->
        <div v-if="!showAdminPlaceholder" class="hidden md:flex items-center justify-center flex-1 gap-4">
          <h2 class="text-lg font-bold text-slate-700 dark:text-slate-200 capitalize">
            {{ viewTitle }}
          </h2>

          <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
            <button v-if="!isCurrentWeek" @click="jumpToToday"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-colors">
              <span class="material-symbols-outlined text-sm">today</span>
              Voltar para Hoje
            </button>
          </transition>
        </div>

        <!-- Weekly Goal Progress (Hide on Admin Placeholder) -->
        <div v-if="!showAdminPlaceholder" class="flex items-center gap-6 justify-end max-w-md w-full">

          <!-- Pending Actions Notification (Manual Dropdown) -->
          <div v-if="pendingActions.length > 0" class="relative z-30">
            <UButton @click="isPendingActionsOpen = !isPendingActionsOpen" variant="ghost" size="sm"
              class="rounded-full whitespace-nowrap font-bold transition-all border px-3 py-1.5" :class="[
                pendingActions.some((a: any) => a.type === 'REJECTED')
                  ? (isPendingActionsOpen ? 'text-red-700 dark:text-red-400 border-red-600 dark:border-red-400 bg-red-100 dark:bg-red-900/30' : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20')
                  : (isPendingActionsOpen ? 'text-amber-700 dark:text-amber-400 border-amber-600 dark:border-amber-400 bg-amber-100 dark:bg-amber-900/30' : 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20')
              ]">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-base flex-none" />
              <span>{{ pendingActions.length }} Pendência{{ pendingActions.length > 1 ? 's' : '' }}</span>
              <UIcon name="i-heroicons-chevron-down" class="text-xs ml-1 transition-transform"
                :class="isPendingActionsOpen ? 'rotate-180' : ''" />
            </UButton>

            <!-- Dropdown Panel -->
            <div v-if="isPendingActionsOpen"
              class="absolute top-full right-0 mt-2 p-1 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl flex flex-col gap-1 z-50 animate-[fade-in_0.1s_ease-out]">
              <button v-for="(action, idx) in pendingActions" :key="idx"
                @click="jumpToWeek(action.year, action.week); isPendingActionsOpen = false"
                class="flex items-center gap-2 p-2 rounded-lg text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 group w-full">
                <UIcon :name="action.type === 'REJECTED' ? 'i-heroicons-x-circle' : 'i-heroicons-clock'"
                  class="text-base flex-none" :class="action.type === 'REJECTED' ? 'text-red-500' : 'text-amber-500'" />
                <div class="flex flex-col flex-1 min-w-0">
                  <span
                    class="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#0984e3] truncate">
                    {{ action.label }}
                  </span>
                  <span class="text-[10px] text-slate-500 font-medium truncate">
                    {{ action.type === 'REJECTED' ? (action.reason || 'Rejeitada') : 'Não enviada' }}
                  </span>
                </div>
              </button>
            </div>

            <!-- Click Outside Overlay -->
            <div v-if="isPendingActionsOpen" @click="isPendingActionsOpen = false" class="fixed inset-0 z-[-1]" />
          </div>

          <div class="flex flex-col w-full gap-2">
            <div class="flex justify-between items-end">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta
                Mensal</span>
              <div class="text-sm font-medium">
                <span class="font-bold text-slate-900 dark:text-white">{{ monthlyWorkedHours.toFixed(1) }}h</span>
                <span class="text-slate-400">/ {{ monthlyExpectedHours }}h</span>
              </div>
            </div>
            <div class="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="goalColorClass"
                :style="{ width: `${goalPercentage}%` }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timesheet Grid -->
    <main class="flex-1 overflow-auto bg-background-light dark:bg-background-dark min-h-0 flex flex-col">

      <!-- Admin Placeholder View -->
      <div v-if="showAdminPlaceholder"
        class="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-70">
        <div class="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-full mb-6">
          <span
            class="material-symbols-outlined text-6xl text-indigo-500 dark:text-indigo-400">supervisor_account</span>
        </div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">Visão Administrativa</h2>
        <p class="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
          Selecione um professor no menu acima para visualizar a folha de pontos, gerenciar lançamentos e aprovar horas.
        </p>

        <!-- Optional: Helpful Tip or Illustration could go here -->
        <div
          class="flex gap-2 items-center text-xs text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full">
          <span class="material-symbols-outlined text-sm">info</span>
          <span>Você está vendo isso pois não possui turmas atribuídas.</span>
        </div>
      </div>

      <!-- Standard Grid -->
      <div v-else class="h-full w-full max-w-[1600px] mx-auto grid grid-cols-7 gap-4 px-4 py-6">

        <div v-for="day in weekDays" :key="day.toISOString()" class="flex flex-col gap-2 group/col">
          <div :class="[
            'flex flex-col gap-2 p-3 rounded-md border transition-colors',
            day.toDateString() === new Date().toDateString()
              ? 'bg-[#0984e3]/10 border-[#0984e3] dark:bg-[#0984e3]/20 dark:border-[#0984e3]'
              : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
          ]">
            <div class="flex justify-between items-start mb-2">
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{{
                  day.toLocaleDateString('pt-BR', { weekday: 'short' }) }}</span>
                <span class="text-2xl font-bold text-slate-900 dark:text-white leading-none">{{
                  day.getDate() }}</span>
              </div>
              <span
                class="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                {{getEntriesForDay(day).reduce((acc, e) => acc + Number(e.duration), 0)}}h
              </span>
            </div>

          </div>

          <div class="flex-1 flex flex-col gap-2 pb-20">

            <div v-for="entry in getEntriesForDay(day)" :key="entry.id" @click="!isWeekLocked && handleEditEntry(entry)"
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all group/card"
              :class="isWeekLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md hover:border-primary/50 cursor-pointer'">
              <div class="flex justify-between items-start gap-2">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 flex-1">{{
                  entry.assignment?.class?.name ||
                  entry.assignment?.student?.name || 'Sem Nome' }}</h3>
                <span
                  class="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex-none">{{
                    entry.duration }}h</span>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <span v-if="entry.type" :class="[
                  'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                  getEntryTypeColor(entry.type)
                ]">
                  {{ entry.type }}
                </span>
              </div>

              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {{ entry.description }}
              </div>

              <div
                class="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium border-t border-slate-100 dark:border-slate-700/50 pt-2">
                <span class="material-symbols-outlined text-[12px] opacity-70">schedule</span>
                {{ getEntryTimeRange(entry) }}
              </div>
            </div>

            <button @click="handleLogTime(day.toISOString())" :disabled="isWeekLocked" :class="[
              'group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed transition-all',
              isWeekLocked
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-600'
                : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 hover:cursor-pointer'
            ]">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Lançar Horas</span>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Sticky Footer -->
    <div v-if="!showAdminPlaceholder"
      class="flex-none bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex justify-between z-20">

      <!-- Rejection Alert -->
      <div v-if="weeklyStatus === 'REJECTED' && rejectionReason"
        class="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800">
        <UIcon name="i-heroicons-exclamation-circle" class="text-xl" />
        <div>
          <p class="text-xs font-bold uppercase">Semana Rejeitada</p>
          <p class="text-sm">{{ rejectionReason }}</p>
        </div>
      </div>
      <div v-else></div> <!-- Spacer -->

      <div class="flex gap-4">
        <div v-if="weeklyStatus === 'SUBMITTED'"
          class="flex items-center gap-2 text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-800">
          <UIcon name="i-heroicons-clock" class="text-xl animate-pulse" />
          <span class="font-bold">Aguardando Aprovação</span>
        </div>

        <div v-if="weeklyStatus === 'APPROVED'"
          class="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
          <UIcon name="i-heroicons-check-circle" class="text-xl" />
          <span class="font-bold">Semana Aprovada</span>
        </div>

        <button v-if="weeklyStatus === 'PENDING' || weeklyStatus === 'REJECTED'" @click="submitWeek"
          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold shadow-lg shadow-[#0984e3]/30 transition-all">
          <span class="truncate">Enviar Semana para Aprovação</span>
        </button>
      </div>
    </div>
  </div>
  <TimesheetModal v-model="isModalOpen" :initial-date="selectedDate" :initial-data="selectedEntry"
    :assignments="assignments" @save="handleSaveEntry" @delete="handleDeleteEntry" />

  <AuditLogDrawer v-model="isAuditDrawerOpen" :timesheet-id="timesheet?.id" />
</template>
```
