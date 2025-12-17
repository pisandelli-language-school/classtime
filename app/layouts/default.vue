<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()
const userMetadata = computed(() => user.value?.user_metadata || {})

const isDropdownOpen = ref(false)

const handleLogout = async () => {
  await client.auth.signOut()
  navigateTo('/login')
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const closeDropdown = () => {
  isDropdownOpen.value = false
}
</script>

<template>
  <div
    class="h-screen w-full grid grid-rows-[auto_1fr] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
    <!-- Header -->
    <header
      class="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 z-20">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center justify-center">
          <img src="/logo.svg" alt="ClassTime Logo" class="w-40" />
        </NuxtLink>

        <!-- Main Nav -->
        <div class="hidden md:flex items-center gap-6 ml-8">
          <NuxtLink to="/" class="text-sm font-medium hover:text-primary transition-colors text-primary"
            active-class="text-primary">
            Timesheet
          </NuxtLink>
          <a class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
            href="#">
            Reports
          </a>
          <a class="text-sm font-medium hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
            href="#">
            Students
          </a>
        </div>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <button
          class="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-white transition-colors">
          <span class="material-symbols-outlined">settings</span>
        </button>
        <button
          class="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-white transition-colors">
          <span class="material-symbols-outlined">notifications</span>
        </button>
        <span v-if="user" class="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">{{
          userMetadata.full_name || user.email }}</span>
        <div class="relative">
          <button @click="toggleDropdown"
            class="flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 ring-2 ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700 transition-all focus:outline-none">
            <img :alt="userMetadata.full_name || 'User avatar'" class="h-full w-full object-cover"
              :src="userMetadata.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-4IIbkOC0tVNX_mp9JdRFphq0mImv9xRR4l4pGZoTN_PmNVd7AhvtoD531_SPTAEihPVobUq9FAaG3vE4ch8A5f_C4pbOss3xOh0hst_B77pYpRQH6ZTA5GTYzsKjYOwSzMvO1mmRY1PMvuJmQAFA8MdPf57qCRnq2PKFuyHRgLGdIOhkZamuvdj61UxtDAi48SJjp-2UWgtLxaRHdixQOx7cgIGopZG2wgZACg7xUWtxAKfAfLIOHwg06nsZkaxb16dZuXvRI2w'" />
          </button>

          <!-- Dropdown Menu -->
          <div v-if="isDropdownOpen" @click.self="closeDropdown" class="fixed inset-0 z-30 cursor-default"
            aria-hidden="true"></div>
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
              Sign out
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Page Content Slot Wrapper -->
    <div class="overflow-hidden relative flex flex-col min-h-0 h-full">
      <slot />
    </div>
  </div>
</template>
