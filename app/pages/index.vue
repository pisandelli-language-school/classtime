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
  selectedEntry.value = entry
  isModalOpen.value = true
}

const handleSaveEntry = async (entry: any) => {
  try {
    const payload = {
      timesheetId: timesheet.value?.id,
      date: new Date(entry.date).toISOString(),
      duration: Number(entry.hours),
      assignmentId: entry.subject?.id || entry.subject, // Handle object or ID
      description: entry.description,
      type: entry.type
    }

    await $fetch('/api/timesheets/entries', {
      method: 'POST',
      body: payload
    })

    await refresh() // Refresh data to show new entry
  } catch (error) {
    console.error('Failed to save entry:', error)
    // alert('Failed to save entry') // Optional user feedback
  }
}
const weekDays = computed(() => {
  const curr = new Date()
  const first = curr.getDate() - curr.getDay() + 1 // Monday
  const days = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(curr.setDate(first + i))
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
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
const headerDateRange = computed(() => {
  if (!weekDays.value || weekDays.value.length < 5) return ''
  const start = weekDays.value[0]
  const end = weekDays.value[4]

  if (!start || !end) return ''

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})
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
            <button
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Weekly Goal Progress -->
        <div class="flex items-center gap-6 flex-1 justify-end max-w-md w-full">
          <div class="flex flex-col w-full gap-2">
            <div class="flex justify-between items-end">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Weekly
                Goal</span>
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
    <main class="overflow-x-auto overflow-y-hidden bg-background-light dark:bg-background-dark p-6 min-h-0">
      <div class="h-full min-w-[1000px] mx-auto max-w-[1600px] grid grid-cols-5 gap-4">

        <div v-for="day in weekDays" :key="day.toISOString()" class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">{{ formatDate(day) }}</span>
              <!-- Sum duration logic could go here -->
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                {{getEntriesForDay(day).reduce((acc, e) => acc + Number(e.duration), 0)}}h
              </span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <!-- Progress bar logic (simplified) -->
              <div class="h-full bg-primary rounded-full"
                :style="{ width: Math.min((getEntriesForDay(day).reduce((acc, e) => acc + Number(e.duration), 0) / 8) * 100, 100) + '%' }">
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">

            <div v-for="entry in getEntriesForDay(day)" :key="entry.id" @click="handleEditEntry(entry)"
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">{{ entry.assignment?.student?.name ||
                  entry.assignment?.class?.name || 'Unknown' }}</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{{
                    entry.duration }}h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {{ entry.description }}
              </div>
              <!-- <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 9:00 AM - 10:30 AM
              </div> -->
            </div>

            <button @click="handleLogTime(day.toISOString())"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all hover:cursor-pointer">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
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
          <span class="truncate">Submit Week for Approval</span>
        </button>
      </div>
    </div>
  </div>
  <TimesheetModal v-model="isModalOpen" :initial-date="selectedDate" :initial-data="selectedEntry"
    :assignments="assignments" @save="handleSaveEntry" />
</template>
