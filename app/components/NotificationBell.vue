<script setup lang="ts">
import { setISOWeek, setYear, startOfISOWeek } from 'date-fns'

const { data, refresh } = useFetch('/api/timesheets/pending-actions', {
  lazy: true,
  server: false
})

const actions = computed(() => data.value?.actions || [])
const hasNotifications = computed(() => actions.value.length > 0)

const router = useRouter()

const handleActionClick = (action: any) => {
  // Calculate date for that week (Monday)
  const targetDate = startOfISOWeek(setISOWeek(setYear(new Date(), action.year), action.week))

  router.push({
    path: '/',
    query: { date: targetDate.toISOString() }
  })
}

// Refresh periodically
let interval: any
onMounted(() => {
  interval = setInterval(() => {
    refresh()
  }, 60000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <!-- Use div or fragment if popover is tricky, for now UPopover is fine -->
  <UPopover v-if="hasNotifications" mode="click">
    <UButton color="neutral" variant="ghost" class="relative">
      <UIcon name="i-heroicons-bell" class="text-xl text-slate-500 dark:text-slate-400" />
      <span class="absolute top-1 right-1 flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
      </span>
    </UButton>

    <template #panel>
      <div
        class="p-4 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-100 dark:border-slate-800">
        <h3 class="font-bold text-slate-900 dark:text-white mb-3 text-sm">Pendências</h3>
        <div class="space-y-2">
          <div v-for="(action, idx) in actions" :key="idx" @click="handleActionClick(action)"
            class="p-3 rounded-lg border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            :class="action.type === 'REJECTED' ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900' : 'border-slate-200 dark:border-slate-700'">

            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold uppercase"
                :class="action.type === 'REJECTED' ? 'text-red-600' : 'text-slate-600'">
                {{ action.type === 'REJECTED' ? 'Rejeitado' : 'Envio Pendente' }}
              </span>
              <span class="text-[10px] text-slate-400">{{ action.year }}</span>
            </div>

            <div class="text-sm font-medium text-slate-800 dark:text-slate-200">
              {{ action.label }}
            </div>

            <div v-if="action.reason" class="text-xs text-red-500 mt-1 line-clamp-2">
              "{{ action.reason }}"
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>

  <UButton v-else color="neutral" variant="ghost" disabled>
    <UIcon name="i-heroicons-bell" class="text-xl text-slate-300 dark:text-slate-600" />
  </UButton>
</template>
