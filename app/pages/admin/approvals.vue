<script setup lang="ts">
import { format, startOfISOWeek, endOfISOWeek, setISOWeek, setISOWeekYear, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Date Navigation ---
const currentDate = useState<Date>('approvals-ref-date', () => new Date())

const weekRange = computed(() => {
    const start = startOfISOWeek(currentDate.value)
    const end = endOfISOWeek(currentDate.value)
    return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`
})

const navigateWeek = (direction: 'prev' | 'next' | 'current') => {
    if (direction === 'prev') currentDate.value = subWeeks(currentDate.value, 1)
    else if (direction === 'next') currentDate.value = addWeeks(currentDate.value, 1)
    else currentDate.value = new Date()
}

// --- Data Fetching ---
const mode = ref<'week' | 'backlog'>('week')

const { data: approvalsData, pending, refresh } = useFetch('/api/admin/approvals', {
    query: {
        date: computed(() => currentDate.value.toISOString()),
        mode: mode
    },
    watch: [currentDate, mode]
})

const approvals = computed(() => (approvalsData.value?.approvals as any[]) || [])

// --- Filters ---
const statusFilter = ref('ALL') // ALL, PENDING, SUBMITTED, APPROVED, REJECTED
const filteredApprovals = computed(() => {
    let list = approvals.value
    if (statusFilter.value !== 'ALL') {
        const f = statusFilter.value
        list = list.filter((a: any) => a.status === f)
    }
    return [...list].sort((a: any, b: any) => a.name.localeCompare(b.name))
})

// --- Modal State ---
const selectedTeacherId = ref<string | null>(null)
const selectedTeacherName = ref('')
const selectedTeacherEmail = ref('')
const isDetailModalOpen = ref(false)
const selectedTeacherExpectedHours = ref(0)
const selectedTeacherAvatar = ref<string | null>(null)
const selectedTeacherStatus = ref<string | undefined>(undefined)
const modalDate = ref(new Date())

const openDetail = (teacher: any) => {
    selectedTeacherId.value = teacher.id
    selectedTeacherName.value = teacher.name
    selectedTeacherEmail.value = teacher.email
    selectedTeacherExpectedHours.value = teacher.weeklyExpectedHours || 0
    selectedTeacherAvatar.value = teacher.avatar || null
    selectedTeacherStatus.value = teacher.status

    // Determine the date context for this teacher
    if (teacher.weekInfo) {
        let d = new Date()
        d = setISOWeekYear(d, teacher.weekInfo.year)
        d = setISOWeek(d, teacher.weekInfo.week)
        modalDate.value = d
    } else {
        modalDate.value = new Date(currentDate.value)
    }

    isDetailModalOpen.value = true
}

const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'REOPEN', reason?: string, item?: any) => {
    // Determine target context: Item (Direct Action) vs SelectedTeacher (Modal)
    const targetId = item?.userId || item?.id || selectedTeacherId.value

    // Determine target Date: 
    // If item provided, use its weekInfo to construct date.
    // If modal open, use modalDate.
    let targetDate = modalDate.value
    if (item && item.weekInfo) {
        let d = new Date()
        d = setISOWeekYear(d, item.weekInfo.year)
        d = setISOWeek(d, item.weekInfo.week)
        targetDate = d
    }

    if (!targetId) return

    if (action === 'REOPEN' && !confirm('Tem certeza que deseja reabrir esta semana? O status voltará para Pendente.')) return

    try {
        await $fetch('/api/admin/approvals/action', {
            method: 'POST',
            body: {
                teacherId: targetId,
                date: targetDate,
                action,
                reason
            }
        })
        isDetailModalOpen.value = false
        refresh() // Refresh list
    } catch (e) {
        alert('Erro ao processar ação: ' + e)
    }
}

// Helpers
const getStatusColor = (status: string) => {
    switch (status) {
        case 'APPROVED': return 'success'
        case 'SUBMITTED': return 'info' // Uses our configured Blue (#0984e3)
        case 'REJECTED': return 'error'
        default: return 'warning' // Pending is now Orange/Warning
    }
}
const getStatusLabel = (status: string) => {
    switch (status) {
        case 'APPROVED': return 'Aprovado'
        case 'SUBMITTED': return 'Enviado'
        case 'REJECTED': return 'Rejeitado'
        default: return 'Pendente'
    }
}


const getInitials = (name: string) => {
    if (!name) return '?'
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

const imageErrors = ref<Record<string, boolean>>({})
const handleImageError = (id: string) => {
    imageErrors.value[id] = true
}

// Week Label Helper
const getWeekLabel = (year: number, week: number) => {
    // Construct a date from ISO Week
    // We start with a date in that year
    // Better: use date-fns helpers
    // We need to set year first, then week.
    let date = new Date()
    date = setISOWeekYear(date, year)
    date = setISOWeek(date, week)

    const start = startOfISOWeek(date)
    const end = endOfISOWeek(date)
    return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}`
}
</script>

<template>
    <div class="p-8 space-y-6">
        <div class="flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Aprovação de Horas</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">Gerencie e aprove os lançamentos semanais.</p>
            </div>
        </div>

        <!-- Controls Bar -->
        <UCard :ui="{ body: { padding: 'p-4' } as any }">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <!-- Week Navigation (Hidden in Backlog Mode) -->
                <div v-if="mode === 'week'"
                    class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <UButton icon="i-heroicons-chevron-left" color="neutral" variant="ghost" size="sm"
                        @click="navigateWeek('prev')" />
                    <span class="text-sm font-medium min-w-[120px] text-center">{{ weekRange }}</span>
                    <UButton icon="i-heroicons-chevron-right" color="neutral" variant="ghost" size="sm"
                        @click="navigateWeek('next')" />
                    <UTooltip text="Voltar para hoje">
                        <UButton icon="i-heroicons-calendar" color="neutral" variant="ghost" size="sm"
                            @click="navigateWeek('current')" />
                    </UTooltip>
                </div>
                <div v-else></div>

                <!-- Backlog Toggle Button -->
                <div class="flex items-center">
                    <UButton :label="mode === 'week' ? 'Ver pendências' : 'Voltar para Semana Atual'"
                        :icon="mode === 'week' ? 'i-heroicons-archive-box' : 'i-heroicons-arrow-uturn-left'"
                        :color="mode === 'week' ? 'warning' : 'primary'" variant="soft" size="sm"
                        class="transition-all duration-200" @click="mode = mode === 'week' ? 'backlog' : 'week'" />
                </div>
            </div>
        </UCard>

        <!-- Table -->
        <UCard :ui="{ body: { padding: 'p-0' } as any }">
            <div v-if="pending" class="p-8 text-center flex justify-center">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
            </div>
            <div v-else-if="filteredApprovals.length === 0" class="p-12 text-center text-slate-400">
                <p>Nenhum registro encontrado.</p>
            </div>
            <table v-else class="w-full text-sm text-left">
                <thead
                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th class="px-6 py-3">Professor</th>
                        <th class="px-6 py-3 text-center">Semana</th>
                        <th class="px-6 py-3 text-center">Horas da Semana</th>
                        <th class="px-6 py-3 text-center">Status</th>
                        <th class="px-6 py-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="item in filteredApprovals" :key="item.id || item.googleId + item.weekInfo?.week"
                        class="border-b dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-colors even:bg-slate-50 dark:even:bg-slate-800/30"
                        @click="openDetail(item)">
                        <!-- Professor -->
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div
                                    class="relative inline-flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                                    <img v-if="item.avatar && !imageErrors[item.id]" :src="item.avatar" :alt="item.name"
                                        class="w-full h-full object-cover" referrerpolicy="no-referrer"
                                        @error="handleImageError(item.id)" />
                                    <span v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {{ getInitials(item.name) }}
                                    </span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="font-bold text-slate-900 dark:text-white">{{ item.name }}</span>
                                    <span class="text-xs text-slate-500">{{ item.email }}</span>
                                </div>
                            </div>
                        </td>

                        <!-- Week Column -->
                        <td class="px-6 py-4 text-center font-mono text-xs text-slate-500">
                            <span v-if="item.weekInfo">{{ getWeekLabel(item.weekInfo.year, item.weekInfo.week) }}</span>
                            <span v-else>-</span>
                        </td>

                        <!-- Hours -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex flex-col items-center">
                                <span class="text-lg font-mono font-semibold" :class="{
                                    'text-green-600 dark:text-green-400': Number(item.weeklyWorkedHours) >= item.weeklyExpectedHours && item.weeklyExpectedHours > 0,
                                    'text-amber-500 dark:text-amber-400': Number(item.weeklyWorkedHours) > 0 && Number(item.weeklyWorkedHours) < item.weeklyExpectedHours,
                                    'text-red-500 dark:text-red-400': Number(item.weeklyWorkedHours) === 0 && item.weeklyExpectedHours > 0,
                                    'text-blue-500 dark:text-blue-400': item.weeklyExpectedHours === 0
                                }">
                                    {{ item.weeklyWorkedHours }}h
                                </span>
                                <span class="text-xs text-slate-400">Meta: {{ item.weeklyExpectedHours }}h</span>
                            </div>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex flex-col items-center justify-center gap-1">
                                <UBadge :color="getStatusColor(item.status)" variant="soft">
                                    {{ getStatusLabel(item.status) }}
                                </UBadge>
                                <div v-if="item.rejectionReason" class="text-xs text-red-500 max-w-[150px] truncate"
                                    :title="item.rejectionReason">
                                    Motivo: {{ item.rejectionReason }}
                                </div>
                            </div>
                        </td>

                        <!-- Actions -->
                        <td class="px-6 py-4 text-right">
                            <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-magnifying-glass"
                                @click.stop="openDetail(item)">
                                Analisar
                            </UButton>
                            <!-- Reopen Action (Root Only) -->
                            <UTooltip
                                v-if="approvalsData.currentUserRole === 'ROOT' && (item.status === 'APPROVED' || item.status === 'REJECTED')"
                                text="Reabrir Semana (Root)">
                                <UButton size="xs" color="warning" variant="ghost" icon="i-heroicons-arrow-path"
                                    class="ml-2" @click.stop="handleApprovalAction('REOPEN', undefined, item)" />
                            </UTooltip>
                        </td>
                    </tr>
                </tbody>
            </table>
        </UCard>

        <!-- Detailed Modal -->
        <WeeklySummaryModal v-if="isDetailModalOpen" v-model="isDetailModalOpen" :teacher-id="selectedTeacherId"
            :teacher-name="selectedTeacherName" :teacher-email="selectedTeacherEmail" :date="modalDate"
            :expected-hours="selectedTeacherExpectedHours" :teacher-avatar="selectedTeacherAvatar"
            :status="selectedTeacherStatus" @action="handleApprovalAction" />

    </div>
</template>