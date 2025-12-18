<script setup lang="ts">
const { data: timesheetData, refresh } = await useFetch('/api/timesheets/current')

const isModalOpen = ref(false)
const selectedDate = ref('')

const timesheet = computed(() => timesheetData.value?.timesheet)
const assignments = computed(() => timesheetData.value?.assignments || [])
const entries = computed(() => timesheet.value?.entries || [])

const selectedEntry = ref<any>(undefined)

const handleLogTime = (date: string) => {
  selectedDate.value = date
  selectedEntry.value = undefined
  isModalOpen.value = true
}

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
      type: entry.type
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



const handleRequestApproval = () => {
  alert('Solicitação enviada ao gerente (Placeholder)')
}

const currentReferenceDate = ref(new Date())

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


const getEntriesForDay = (date: Date) => {
  return entries.value.filter(e => {
    const entryDate = new Date(e.date)
    return entryDate.getDate() === date.getDate() &&
      entryDate.getMonth() === date.getMonth() &&
      entryDate.getFullYear() === date.getFullYear()
  })
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

  const format = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: 'numeric', minute: '2-digit' })
  return `${format(start)} - ${format(end)}`
}
</script>

<template>
  <div class="h-full grid grid-rows-[auto_1fr_auto] min-h-0">
    <!-- Secondary Header / Controls -->
    <div class="flex-none border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
      <div class="max-w-[1600px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Date Navigation -->
        <div
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

        <!-- Dynamic Header Center -->
        <div class="hidden md:flex items-center justify-center flex-1 gap-4">
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

        <!-- Weekly Goal Progress -->
        <div class="flex items-center gap-6 justify-end max-w-md w-full">
          <div class="flex flex-col w-full gap-2">
            <div class="flex justify-between items-end">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta
                Mensal</span>
              <div class="text-sm font-medium">
                <span class="font-bold text-slate-900 dark:text-white">32h</span>
                <span class="text-slate-400">/ 40h</span>
              </div>
            </div>
            <div class="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-green-500 rounded-full" style="width: 80%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timesheet Grid -->
    <main class="overflow-auto bg-background-light dark:bg-background-dark px-4 py-6 min-h-0">
      <div class="h-full min-w-[1000px] mx-auto max-w-[1600px] grid grid-cols-7 gap-4">

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

            <div v-for="entry in getEntriesForDay(day)" :key="entry.id" @click="handleEditEntry(entry)"
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start gap-2">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 flex-1">{{
                  entry.assignment?.student?.name ||
                  entry.assignment?.class?.name || 'Unknown' }}</h3>
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

            <button @click="day.getDay() === 0 ? handleRequestApproval() : handleLogTime(day.toISOString())" :class="[
              'group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed transition-all hover:cursor-pointer',
              day.getDay() === 0
                ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:border-amber-400 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-500 dark:hover:bg-amber-900/30'
                : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50'
            ]">
              <span class="material-symbols-outlined text-lg">{{ day.getDay() === 0 ? 'priority_high' : 'add' }}</span>
              <span class="text-xs font-medium">{{ day.getDay() === 0 ? 'Solicitar Aprovação' : 'Lançar Horas' }}</span>
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- Sticky Footer -->
    <div
      class="flex-none bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex justify-end z-20">
      <div class="flex gap-4">

        <button
          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-[#0984e3] hover:bg-[#026aa7] text-white text-sm font-bold shadow-lg shadow-[#0984e3]/30 transition-all">
          <span class="truncate">Enviar Semana para Aprovação</span>
        </button>
      </div>
    </div>
  </div>
  <TimesheetModal v-model="isModalOpen" :initial-date="selectedDate" :initial-data="selectedEntry"
    :assignments="assignments" @save="handleSaveEntry" @delete="handleDeleteEntry" />
</template>
```
