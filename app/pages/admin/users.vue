<script setup lang="ts">
const { data: usersData, pending, error, refresh } = await useFetch('/api/admin/users')

const search = ref('')
const selectedRole = ref<string | null>(null) // null = All



// Filter Users
const filteredUsers = computed(() => {
  if (!usersData.value?.success || !usersData.value?.users) return []

  let users = usersData.value.users

  // Search Filter
  if (search.value) {
    const q = search.value.toLowerCase()
    users = users.filter((u: any) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }

  // Role Filter
  if (selectedRole.value) {
    users = users.filter((u: any) => u.role === selectedRole.value)
  }

  return users
})



const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Modal State (Placeholder for next step)
const isEditModalOpen = ref(false)
const selectedUser = ref(null)

const openEditModal = (user: any) => {
  selectedUser.value = user
  isEditModalOpen.value = true
}

const roleOptions = [
  { label: 'Todos', value: null },
  { label: 'Professores', value: 'Teacher' },
  { label: 'Gerentes', value: 'Manager' },
  { label: 'Admins', value: 'Admin' }
]



</script>

<template>
  <div class="p-8 space-y-6">

    <!-- Top Bar -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Usuários</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Gerencie perfis, taxas e turmas dos professores.</p>
      </div>
      <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left-20-solid">Voltar ao Timesheet</UButton>
    </div>

    <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
      <template #header>
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div class="flex items-center gap-4 w-full sm:w-auto">
            <ClientOnly>
              <UInput v-model="search" icon="i-heroicons-magnifying-glass-20-solid"
                placeholder="Buscar por nome ou email..." class="w-full sm:w-64" />
            </ClientOnly>

            <!-- Role Filter -->
            <div class="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button v-for="opt in roleOptions" :key="opt.label" @click="selectedRole = opt.value"
                class="px-3 py-1 text-xs font-semibold rounded-md transition-colors" :class="selectedRole === opt.value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="text-right">
            <span class="text-xs text-slate-500">Total: <span class="font-bold text-slate-900 dark:text-white">{{
              filteredUsers.length }}</span></span>
          </div>
        </div>
      </template>

      <!-- Content Wrapper to avoid Hydration Mismatch -->
      <div>
        <!-- Loading State -->
        <div v-if="pending" class="p-8 flex justify-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
        </div>

        <!-- Error State -->
        <div v-else-if="error || (usersData && !usersData.success)" class="p-8 text-center text-red-500">
          <p class="font-bold">Erro ao carregar usuários</p>
          <p class="text-sm">{{ error?.message || usersData?.error }}</p>
          <UButton @click="refresh" variant="soft" color="red" class="mt-4" size="sm">Tentar Novamente</UButton>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredUsers.length === 0" class="p-12 text-center text-slate-400">
          <UIcon name="i-heroicons-users" class="text-4xl mb-2 opacity-50" />
          <p>Nenhum usuário encontrado</p>
        </div>

        <!-- Table -->
        <div v-else>
          <div class="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <!-- Set min-height to allow scrolling if needed locally or just for layout -->
            <table class="w-full text-sm text-left relative">
              <thead
                class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th class="px-6 py-3">Usuário</th>
                  <th class="px-6 py-3 hidden sm:table-cell">Email</th>
                  <th class="px-6 py-3">Função</th>
                  <th class="px-6 py-3 hidden md:table-cell">Valor Hora</th>
                  <th class="px-6 py-3 hidden lg:table-cell">Horas Previstas (Mês)</th>
                  <th class="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="user in filteredUsers" :key="user.id"
                  class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

                  <!-- User Info -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <UAvatar :src="user.avatar" :alt="user.name" size="sm" />
                      <div class="flex flex-col">
                        <span class="font-medium text-slate-900 dark:text-white">{{ user.name }}</span>
                        <span class="text-xs text-slate-500 sm:hidden">{{ user.email }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Email -->
                  <td class="px-6 py-4 text-slate-500 hidden sm:table-cell">
                    {{ user.email }}
                  </td>

                  <!-- Role -->
                  <td class="px-6 py-4">
                    <div class="flex flex-col items-start gap-1">
                      <UBadge :color="user.role === 'Admin' ? 'purple' : user.role === 'Manager' ? 'blue' : 'green'"
                        variant="subtle" size="xs">
                        {{ user.role === 'Admin' ? 'Administrador' : user.role === 'Manager' ? 'Gerente' : 'Professor'
                        }}
                      </UBadge>
                      <span v-if="user.role !== 'Teacher' && user.orgDepartment"
                        class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {{ user.orgDepartment }}
                      </span>
                    </div>
                  </td>

                  <!-- Rates -->
                  <td class="px-6 py-4 hidden md:table-cell">
                    <span v-if="user.role === 'Teacher'" class="font-medium text-slate-900 dark:text-white">
                      {{ formatCurrency(user.hourlyRate) }}
                    </span>
                    <span v-else class="text-slate-300">-</span>
                  </td>

                  <!-- Hours -->
                  <td class="px-6 py-4 hidden lg:table-cell">
                    <span v-if="user.role === 'Teacher'" class="font-medium">
                      {{ user.monthlyExpectedHours }}h
                    </span>
                    <span v-else class="text-slate-300">-</span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 text-right">
                    <UButton v-if="user.role === 'Teacher'" @click="openEditModal(user)" color="white" variant="solid"
                      size="xs" icon="i-heroicons-pencil-square-20-solid">
                      Editar
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </UCard>

    <!-- Modal Placeholder -->
    <!-- <TeacherEditModal v-model="isEditModalOpen" :user="selectedUser" @refresh="refresh" /> -->

  </div>
</template>