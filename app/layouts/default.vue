<script setup lang="ts">
const user = useSupabaseUser()
const userMetadata = computed(() => user.value?.user_metadata || {})
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
        <button
          class="flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
          <img :alt="userMetadata.full_name || 'User avatar'" class="h-full w-full object-cover"
            :src="userMetadata.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-4IIbkOC0tVNX_mp9JdRFphq0mImv9xRR4l4pGZoTN_PmNVd7AhvtoD531_SPTAEihPVobUq9FAaG3vE4ch8A5f_C4pbOss3xOh0hst_B77pYpRQH6ZTA5GTYzsKjYOwSzMvO1mmRY1PMvuJmQAFA8MdPf57qCRnq2PKFuyHRgLGdIOhkZamuvdj61UxtDAi48SJjp-2UWgtLxaRHdixQOx7cgIGopZG2wgZACg7xUWtxAKfAfLIOHwg06nsZkaxb16dZuXvRI2w'" />
        </button>
      </div>
    </header>

    <!-- Page Content Slot Wrapper -->
    <div class="overflow-hidden relative flex flex-col min-h-0 h-full">
      <slot />
    </div>
  </div>
</template>
