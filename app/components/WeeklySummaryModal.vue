<script setup lang="ts">
import { format, startOfISOWeek, endOfISOWeek, isSameDay, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const props = defineProps<{
    modelValue: boolean
    teacherId: string | null
    teacherEmail: string
    teacherName: string
    date: Date // Any date within the week
    expectedHours?: number
    teacherAvatar?: string | null
    status?: string // 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
}>()

const emit = defineEmits(['update:modelValue', 'action'])

const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const canApproveOrReject = computed(() => {
    return props.status !== 'APPROVED' && props.status !== 'REJECTED'
})

// --- Data Fetching ---
const weekStart = computed(() => startOfISOWeek(props.date))
const weekEnd = computed(() => endOfISOWeek(props.date))

const month = computed(() => weekStart.value.getMonth() + 1)
const year = computed(() => weekStart.value.getFullYear())

const { data: timesheetData, pending } = useFetch('/api/timesheets/current', {
    query: {
        teacherEmail: computed(() => props.teacherEmail),
        month,
        year,
        date: computed(() => props.date.toISOString())
    },
    watch: [() => props.teacherEmail, month, year, () => props.date]
})

// Flatten entries and filter by week
const weekEntries = computed(() => {
    const entries = timesheetData.value?.timesheet?.entries || []
    return entries.filter((e: any) => {
        const d = new Date(e.date)
        return isWithinInterval(d, { start: weekStart.value, end: weekEnd.value })
    })
})

// Group by Day
const days = computed(() => {
    const d = new Date(weekStart.value)
    const list = []
    for (let i = 0; i < 7; i++) {
        const current = new Date(d)
        current.setDate(d.getDate() + i)

        const dayEntries = weekEntries.value.filter((e: any) => isSameDay(new Date(e.date), current))
        list.push({
            date: current,
            label: format(current, 'EEEE, dd/MM', { locale: ptBR }),
            entries: dayEntries,
            totalHours: dayEntries.reduce((acc: number, e: any) => acc + Number(e.duration), 0)
        })
    }

    return list
})

// Accordion State
const openDays = ref<Record<string, boolean>>({})
const toggleDay = (label: string) => {
    openDays.value[label] = !openDays.value[label]
}

// Auto-open days with entries
watch(days, (newDays) => {
    newDays.forEach(d => {
        if (d.entries.length > 0) openDays.value[d.label] = true
    })
}, { immediate: true })

const totalWeekHours = computed(() =>
    weekEntries.value.reduce((acc: number, e: any) => acc + Number(e.duration), 0)
)

// --- Validation for Rejection ---
const rejectionReason = ref('')
const isRejecting = ref(false)

const confirmReject = () => {
    if (!rejectionReason.value) return
    emit('action', 'REJECT', rejectionReason.value)
}

const cancelReject = () => {
    isRejecting.value = false
    rejectionReason.value = ''
}

</script>

<template>
    <div v-if="isOpen" @click.self="isOpen = false"
        class="fixed inset-0 bg-[#000000] bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
        <div
            class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">

            <!-- Header -->
            <div
                class="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-slate-900">
                <div class="flex flex-col">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div
                            class="relative inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                            <img v-if="teacherAvatar" :src="teacherAvatar" :alt="teacherName"
                                class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                            <span v-else class="text-xs font-semibold text-gray-500">{{
                                teacherName.charAt(0).toUpperCase() }}</span>
                        </div>
                        {{ teacherName }}
                    </h3>
                    <p class="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                        {{ format(weekStart, 'dd/MM/yyyy') }} até {{ format(weekEnd, 'dd/MM/yyyy') }}
                    </p>
                </div>
                <button
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isOpen = false">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Body (Scrollable) -->
            <div class="overflow-y-auto p-4 space-y-4 flex-1">

                <div v-if="pending" class="flex justify-center py-8">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
                </div>


                <div v-if="weekEntries.length === 0 && !pending" class="text-center py-8 text-slate-400">
                    Sem lançamentos nesta semana.
                </div>

                <div v-for="day in days" :key="day.label"
                    class="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200"
                    :class="{ 'ring-1 ring-primary-500/20 bg-primary-50/20 dark:bg-primary-900/10': openDays[day.label] }">

                    <!-- Day Header (Accordion Trigger) -->
                    <button @click="toggleDay(day.label)"
                        class="w-full flex justify-between items-center p-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                        <span class="font-bold text-slate-700 dark:text-slate-200 capitalize flex items-center gap-2">
                            <UIcon
                                :name="openDays[day.label] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                                class="text-gray-400" />
                            {{ day.label }}
                        </span>
                        <div class="flex items-center gap-2">
                            <UBadge v-if="day.totalHours > 0" color="primary" variant="soft" class="font-mono">{{
                                day.totalHours }}h</UBadge>
                            <span v-else class="text-xs text-gray-400">0h</span>
                        </div>
                    </button>

                    <!-- Collapsible Content -->
                    <div v-if="openDays[day.label]"
                        class="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                        <div v-if="day.entries.length === 0" class="text-sm text-gray-400 italic pl-6">
                            Nenhum lançamento neste dia.
                        </div>

                        <div v-else class="space-y-3 pl-2">
                            <div v-for="entry in day.entries" :key="entry.id"
                                class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start"> <!-- Class/Student & Time -->
                                    <span class="text-base font-bold text-primary-600 dark:text-primary-400">
                                        {{ entry.assignment?.class?.name || entry.assignment?.student?.name }}
                                    </span>
                                    <span class="font-mono font-bold text-gray-700 dark:text-gray-200">{{ entry.duration
                                        }}h</span>
                                </div>
                                <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                    {{ entry.description }}
                                </div>
                                <!-- Reference to attendees -->
                                <div v-if="entry.attendees && entry.attendees.length"
                                    class="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <span
                                        class="text-xs text-gray-400 uppercase tracking-wider font-semibold">Presentes:</span>
                                    <div class="flex flex-wrap gap-1.5">
                                        <span v-for="att in entry.attendees" :key="att.id"
                                            class="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                            {{ att.name }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div
                class="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div class="flex flex-col gap-4">
                    <!-- Total Summary -->
                    <!-- Total Summary Stats Card -->
                    <div
                        class="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div class="flex flex-col">
                            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total
                                Trabalhado</span>
                            <div class="flex items-baseline gap-1">
                                <span class="text-2xl font-bold text-gray-900 dark:text-white"
                                    :class="{ 'text-green-600': expectedHours && totalWeekHours >= expectedHours, 'text-amber-500': expectedHours && totalWeekHours < expectedHours }">
                                    {{ totalWeekHours }}h
                                </span>
                            </div>
                        </div>

                        <div v-if="expectedHours" class="flex flex-col items-end">
                            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Meta Semanal</span>
                            <span class="text-2xl font-bold text-gray-400 dark:text-gray-500 font-mono">
                                / {{ expectedHours }}h
                            </span>
                        </div>
                    </div>

                    <div class="h-px bg-slate-200 dark:bg-slate-700 w-full" />

                    <!-- Actions -->
                    <div v-if="!isRejecting && canApproveOrReject" class="flex justify-end gap-3">
                        <UButton color="error" variant="soft" icon="i-heroicons-x-circle" @click="isRejecting = true">
                            Rejeitar Semana
                        </UButton>
                        <UButton color="success" variant="solid" icon="i-heroicons-check-circle"
                            @click="$emit('action', 'APPROVE')">
                            Aprovar Semana
                        </UButton>
                    </div>
                    <div v-else-if="!canApproveOrReject" class="flex justify-end text-sm text-slate-500 italic">
                        <span>Semana já {{ status === 'APPROVED' ? 'aprovada' : 'rejeitada' }}</span>
                    </div>

                    <!-- Rejection Form -->
                    <div v-else
                        class="space-y-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900">
                        <p class="text-sm font-semibold text-red-600 dark:text-red-400">Motivo da Rejeição:</p>
                        <UTextarea v-model="rejectionReason" placeholder="Explique o motivo para o professor..."
                            :rows="2" autofocus />
                        <div class="flex justify-end gap-2">
                            <UButton color="neutral" variant="ghost" size="sm" @click="cancelReject">Cancelar</UButton>
                            <UButton color="error" variant="solid" size="sm" @click="confirmReject">Confirmar Rejeição
                            </UButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
