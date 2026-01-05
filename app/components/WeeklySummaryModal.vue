<script setup lang="ts">
import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const props = defineProps<{
    modelValue: boolean
    teacherId: string | null
    teacherEmail: string
    teacherName: string
    date: Date // Any date within the week
}>()

const emit = defineEmits(['update:modelValue', 'action'])

const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

// --- Data Fetching ---
const weekStart = computed(() => startOfWeek(props.date, { locale: ptBR }))
const weekEnd = computed(() => endOfWeek(props.date, { locale: ptBR }))

const month = computed(() => weekStart.value.getMonth() + 1)
const year = computed(() => weekStart.value.getFullYear())

const { data: timesheetData, pending } = useFetch('/api/timesheets/current', {
    query: {
        teacherEmail: props.teacherEmail,
        month,
        year
    },
    watch: [() => props.teacherEmail, month, year]
})

// Flatten entries and filter by week
const weekEntries = computed(() => {
    const entries = timesheetData.value?.timesheet?.entries || []
    return entries.filter((e: any) => {
        const d = new Date(e.date)
        return d >= weekStart.value && d <= weekEnd.value
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
                class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                    <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                        Resumo Semanal: {{ teacherName }}
                    </h3>
                    <p class="text-sm text-gray-500">
                        {{ format(weekStart, 'dd/MM') }} até {{ format(weekEnd, 'dd/MM') }}
                    </p>
                </div>
                <button class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    @click="isOpen = false">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Body (Scrollable) -->
            <div class="overflow-y-auto p-4 space-y-4 flex-1">

                <div v-if="pending" class="flex justify-center py-8">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
                </div>
                <div v-else-if="weekEntries.length === 0" class="text-center py-8 text-slate-400">
                    Sem lançamentos nesta semana.
                </div>

                <div v-for="day in days" :key="day.label"
                    class="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-slate-700 dark:text-slate-200 capitalize">{{ day.label }}</span>
                        <UBadge v-if="day.totalHours > 0" color="neutral" variant="soft">{{ day.totalHours }}h</UBadge>
                    </div>

                    <div v-if="day.entries.length === 0" class="text-xs text-slate-400 italic">
                        Nada lançado.
                    </div>

                    <div v-else class="space-y-2">
                        <div v-for="entry in day.entries" :key="entry.id"
                            class="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm">
                            <div class="flex justify-between font-medium"> <!-- Class/Student & Time -->
                                <span class="text-indigo-600 dark:text-indigo-400">
                                    {{ entry.assignment?.class?.name || entry.assignment?.student?.name }}
                                </span>
                                <span>{{ entry.duration }}h</span>
                            </div>
                            <div class="text-slate-600 dark:text-slate-400 mt-1">
                                {{ entry.description }}
                            </div>
                            <!-- Example Attendees listing if needed -->
                            <div v-if="entry.attendees && entry.attendees.length" class="mt-1 flex flex-wrap gap-1">
                                <span v-for="att in entry.attendees" :key="att.id"
                                    class="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                    {{ att.name }}
                                </span>
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
                    <div class="flex justify-between items-center text-sm font-bold">
                        <span>Total da Semana:</span>
                        <span class="text-lg">{{ totalWeekHours }}h</span>
                    </div>

                    <div class="h-px bg-slate-200 dark:bg-slate-700 w-full" />

                    <!-- Actions -->
                    <div v-if="!isRejecting" class="flex justify-end gap-3">
                        <UButton color="red" variant="soft" icon="i-heroicons-x-circle" @click="isRejecting = true">
                            Rejeitar Semana
                        </UButton>
                        <UButton color="green" variant="solid" icon="i-heroicons-check-circle"
                            @click="$emit('action', 'APPROVE')">
                            Aprovar Semana
                        </UButton>
                    </div>

                    <!-- Rejection Form -->
                    <div v-else
                        class="space-y-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-900">
                        <p class="text-sm font-semibold text-red-600 dark:text-red-400">Motivo da Rejeição:</p>
                        <UTextarea v-model="rejectionReason" placeholder="Explique o motivo para o professor..."
                            :rows="2" autofocus />
                        <div class="flex justify-end gap-2">
                            <UButton color="neutral" variant="ghost" size="sm" @click="cancelReject">Cancelar</UButton>
                            <UButton color="red" variant="solid" size="sm" @click="confirmReject">Confirmar Rejeição
                            </UButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
