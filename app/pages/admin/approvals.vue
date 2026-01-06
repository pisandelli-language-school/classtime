<script setup lang="ts">
import { format, startOfISOWeek, endOfISOWeek, addWeeks, subWeeks } from 'date-fns'

// Assuming auth middleware handles redirect if not admin, but good to check

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
const { data: approvalsData, pending, refresh } = useFetch('/api/admin/approvals', {
    query: {
        date: computed(() => currentDate.value.toISOString())
    },
    watch: [currentDate]
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

const openDetail = (teacher: any) => {
    selectedTeacherId.value = teacher.id
    selectedTeacherName.value = teacher.name
    selectedTeacherEmail.value = teacher.email
    isDetailModalOpen.value = true
}

const handleApprovalAction = async (action: 'APPROVE' | 'REJECT', reason?: string) => {
    if (!selectedTeacherId.value) return

    try {
        await $fetch('/api/admin/approvals/action', {
            method: 'POST',
            body: {
                teacherId: selectedTeacherId.value,
                date: currentDate.value,
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
        case 'APPROVED': return 'green' // success
        case 'SUBMITTED': return 'orange' // warning
        case 'REJECTED': return 'red' // error
        default: return 'gray' // neutral
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
</script>

<template>
    <div class="p-8 space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Aprovação de Horas</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">Gerencie e aprove os lançamentos semanais.</p>
            </div>
            <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left-20-solid">Voltar ao Timesheet</UButton>
        </div>

        <!-- Controls Bar -->
        <UCard :ui="{ body: { padding: 'p-4' } as any }">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <!-- Week Navigation -->
                <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
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

                <!-- Filters -->
                <div class="flex gap-2">
                    <USelectMenu v-model="statusFilter" :options="[
                        { label: 'Todos', value: 'ALL' },
                        { label: 'Pendentes', value: 'PENDING' },
                        { label: 'Enviados', value: 'SUBMITTED' },
                        { label: 'Aprovados', value: 'APPROVED' },
                        { label: 'Rejeitados', value: 'REJECTED' }
                    ]" value-attribute="value" option-attribute="label" />
                </div>
            </div>
        </UCard>

        <!-- Table -->
        <UCard :ui="{ body: { padding: 'p-0' } as any }">
            <div v-if="pending" class="p-8 text-center flex justify-center">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
            </div>
            <div v-else-if="filteredApprovals.length === 0" class="p-12 text-center text-slate-400">
                <p>Nenhum registro encontrado para esta semana.</p>
            </div>
            <table v-else class="w-full text-sm text-left">
                <thead
                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th class="px-6 py-3">Professor</th>
                        <th class="px-6 py-3 text-center">Horas da Semana</th>
                        <th class="px-6 py-3 text-center">Status</th>
                        <th class="px-6 py-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr v-for="item in filteredApprovals" :key="item.id"
                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <!-- Professor -->
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div
                                    class="relative inline-flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                                    <img v-if="item.avatar" :src="item.avatar" :alt="item.name"
                                        class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                                    <span v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
                                        item.name.charAt(0).toUpperCase() }}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="font-bold text-slate-900 dark:text-white">{{ item.name }}</span>
                                    <span class="text-xs text-slate-500">{{ item.email }}</span>
                                </div>
                            </div>
                        </td>

                        <!-- Hours -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex flex-col items-center">
                                <span class="text-lg font-mono font-semibold" :class="{
                                    'text-green-600': Number(item.weeklyWorkedHours) >= item.weeklyExpectedHours,
                                    'text-amber-500': Number(item.weeklyWorkedHours) < item.weeklyExpectedHours
                                }">
                                    {{ item.weeklyWorkedHours }}h
                                </span>
                                <span class="text-xs text-slate-400">Meta: {{ item.weeklyExpectedHours }}h</span>
                            </div>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4 text-center">
                            <UBadge :color="getStatusColor(item.status) as any" variant="soft">
                                {{ getStatusLabel(item.status) }}
                            </UBadge>
                            <div v-if="item.rejectionReason" class="text-xs text-red-500 mt-1 max-w-[150px] truncate"
                                :title="item.rejectionReason">
                                Motivo: {{ item.rejectionReason }}
                            </div>
                        </td>

                        <!-- Actions -->
                        <td class="px-6 py-4 text-right">
                            <UButton size="xs" color="neutral" variant="ghost" @click="openDetail(item)">
                                Ver Detalhes
                            </UButton>
                        </td>
                    </tr>
                </tbody>
            </table>
        </UCard>

        <!-- Detailed Modal (Placeholder for now) -->
        <WeeklySummaryModal v-model="isDetailModalOpen" :teacher-id="selectedTeacherId"
            :teacher-name="selectedTeacherName" :teacher-email="selectedTeacherEmail" :date="currentDate"
            @action="handleApprovalAction" />

    </div>
</template>