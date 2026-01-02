<script setup lang="ts">
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const props = defineProps<{
  modelValue: boolean
  timesheetId: string | undefined
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { data, pending, refresh } = useFetch(() => `/api/timesheets/${props.timesheetId}/audit`, {
  immediate: false,
  watch: false,
})

watch([() => props.timesheetId, isOpen], () => {
  if (isOpen.value && props.timesheetId) refresh()
})

const logs = computed(() => (data.value as any)?.logs || [])

const getActionLabel = (action: string) => {
  switch (action) {
    case 'SUBMIT': return 'Enviou para Aprovação';
    case 'APPROVE': return 'Aprovou a Folha';
    case 'REJECT': return 'Rejeitou a Folha';
    case 'CREATE_ENTRY': return 'Criou Lançamento';
    case 'UPDATE_ENTRY': return 'Editou Lançamento';
    case 'DELETE_ENTRY': return 'Removeu Lançamento';
    default: return action;
  }
}

const getActionColor = (action: string) => {
  if (action === 'APPROVE') return 'bg-green-100 text-green-700 border-green-200'
  if (action === 'REJECT' || action === 'DELETE_ENTRY') return 'bg-red-100 text-red-700 border-red-200'
  if (action.includes('ENTRY')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
}

const getActionIcon = (action: string) => {
  if (action === 'APPROVE') return 'check_circle'
  if (action === 'REJECT') return 'cancel'
  if (action === 'CREATE_ENTRY') return 'add_circle'
  if (action === 'DELETE_ENTRY') return 'delete'
  if (action === 'UPDATE_ENTRY') return 'edit'
  return 'send'
}
</script>

<template>
  <Teleport to="body">
    <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">

        <!-- Backdrop -->
        <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="isOpen = false"></div>

        <!-- Drawer Panel -->
        <transition enter-active-class="transform transition duration-300 ease-in-out"
          enter-from-class="translate-x-full" enter-to-class="translate-x-0"
          leave-active-class="transform transition duration-300 ease-in-out" leave-from-class="translate-x-0"
          leave-to-class="translate-x-full">

          <div
            class="relative w-full max-w-sm h-full bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">

            <!-- Header -->
            <div
              class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div>
                <h2 class="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span class="material-symbols-outlined text-slate-400">history</span>
                  Histórico
                </h2>
                <p class="text-xs text-slate-500">Registro de atividades</p>
              </div>
              <button @click="isOpen = false"
                class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">

              <div v-if="pending" class="flex justify-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-xl text-slate-400" />
              </div>

              <div v-else-if="logs.length === 0" class="text-center py-10 text-slate-400 opacity-60">
                <span class="material-symbols-outlined text-3xl mb-2">history_toggle_off</span>
                <p class="text-sm">Nenhuma atividade.</p>
              </div>

              <div v-else
                class="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-700 py-2">

                <div v-for="log in logs" :key="log.id" class="relative pl-12 group">

                  <!-- Timeline Dot -->
                  <div
                    class="absolute left-0 top-1 p-1 bg-slate-50 dark:bg-slate-900 z-10 group-hover:scale-110 transition-transform">
                    <div
                      :class="['w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-sm', getActionColor(log.action)]">
                      <span class="material-symbols-outlined text-base">{{ getActionIcon(log.action) }}</span>
                    </div>
                  </div>

                  <!-- Card -->
                  <div
                    class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-1">
                      <span class="font-bold text-xs text-slate-900 dark:text-white">{{ getActionLabel(log.action)
                      }}</span>
                      <span class="text-[10px] text-slate-400">
                        {{ format(new Date(log.timestamp), "dd/MM HH:mm", { locale: ptBR }) }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2 mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <UAvatar :src="log.actor?.avatar || undefined" :alt="log.actor?.name" size="2xs" />
                      <span class="truncate max-w-[120px]">{{ log.actor?.name }}</span>
                    </div>

                    <div v-if="log.metadata?.description"
                      class="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded border border-slate-100 dark:border-slate-700/50">
                      {{ log.metadata.description }}
                    </div>

                    <div v-if="log.metadata?.reason" class="mt-1 text-[11px] text-red-500 font-medium">
                      Motivo: {{ log.metadata.reason }}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>
