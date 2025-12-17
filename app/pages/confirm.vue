<script setup lang="ts">
const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    return navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
      <p class="text-sm font-medium opacity-70">Authenticating...</p>
    </div>
  </div>
</template>
