<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()
const userMetadata = computed(() => user.value?.user_metadata || {})
const loader = useLoader()

const isDropdownOpen = ref(false)

const handleLogout = async () => {
  await client.auth.signOut()
  navigateTo('/login')
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  if (target) {
    target.src = 'https://ui-avatars.com/api/?name=' + (userMetadata.value.full_name || 'User') + '&background=random'
  }
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}

// Fetch user context for Role Based Access Control in Navbar
// Fetch user context for Role Based Access Control in Navbar
const { data: timesheetData } = useFetch('/api/timesheets/current', {
  lazy: true,
  pick: ['userRole'],
  key: 'layout-user-role',
  dedupe: 'defer',
  watch: [user]
})

const canViewAdmin = computed(() => {
  const role = (timesheetData.value as any)?.userRole
  return ['ROOT', 'MANAGER', 'ADMIN'].includes(role)
})
</script>

<template>
  <div
    class="h-screen w-full grid grid-rows-[auto_1fr] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
    <!-- Header -->
    <header
      class="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 z-50 print:hidden">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center justify-center">
          <img src="/logo.svg" alt="ClassTime Logo" class="w-40" />
        </NuxtLink>


        <!-- Main Nav -->
        <div class="hidden md:flex items-center gap-6 ml-8">
          <NuxtLink to="/"
            class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
            active-class="text-primary">
            Timesheet
          </NuxtLink>
          <template v-if="canViewAdmin">
            <NuxtLink to="/admin/approvals"
              class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
              active-class="text-primary">
              Aprovações
            </NuxtLink>
            <NuxtLink to="/admin/contracts"
              class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
              active-class="text-primary">
              Contratos
            </NuxtLink>
            <NuxtLink to="/admin/users"
              class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
              active-class="text-primary">
              Usuários
            </NuxtLink>
            <NuxtLink to="/admin/invoices"
              class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
              active-class="text-primary">
              Faturamento
            </NuxtLink>
          </template>
        </div>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">

        <!-- Help Icon -->
        <NuxtLink to="/help"
          class="flex items-center justify-center w-8 h-8 rounded-full text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title="Ajuda">
          <span class="material-symbols-outlined text-[20px]">help</span>
        </NuxtLink>

        <span v-if="user" class="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">{{
          userMetadata.full_name || user.email }}</span>
        <div class="relative">
          <button @click="toggleDropdown"
            class="flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 ring-2 ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700 transition-all focus:outline-none">
            <img :alt="userMetadata.full_name || 'User avatar'" class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
              :src="userMetadata.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-4IIbkOC0tVNX_mp9JdRFphq0mImv9xRR4l4pGZoTN_PmNVd7AhvtoD531_SPTAEihPVobUq9FAaG3vE4ch8A5f_C4pbOss3xOh0hst_B77pYpRQH6ZTA5GTYzsKjYOwSzMvO1mmRY1PMvuJmQAFA8MdPf57qCRnq2PKFuyHRgLGdIOhkZamuvdj61UxtDAi48SJjp-2UWgtLxaRHdixQOx7cgIGopZG2wgZACg7xUWtxAKfAfLIOHwg06nsZkaxb16dZuXvRI2w'"
              @error="handleImageError" />
          </button>

          <!-- Dropdown Menu -->
          <div v-if="isDropdownOpen" @click.self="closeDropdown" class="fixed inset-0 z-30 cursor-default"
            aria-hidden="true">
          </div>
          <div v-show="isDropdownOpen"
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 z-40 transform origin-top-right transition-all">
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p class="text-sm text-slate-900 dark:text-white font-medium truncate">{{ userMetadata.full_name || 'User'
              }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ user?.email }}</p>
            </div>
            <a href="#" @click.prevent="handleLogout"
              class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0984e3] transition-colors flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">logout</span>
              Sair
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content Slot Wrapper -->
    <div class="overflow-hidden relative flex flex-col min-h-0 h-full">
      <slot />
    </div>

    <!-- Global Loading Overlay -->
    <div v-if="loader.isLoading.value"
      class="fixed inset-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 rounded-full border-4 border-[#0984e3]/20 border-t-[#0984e3] animate-spin"></div>
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300 opacity-70 animate-pulse">{{
          loader.loadingMessage.value }}</span>
      </div>
    </div>
  </div>
</template>
