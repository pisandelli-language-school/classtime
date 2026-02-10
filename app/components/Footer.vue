<script setup lang="ts">
const config = useRuntimeConfig()
const version = config.public.appVersion
</script>

<template>
  <footer class="w-full py-4 text-center text-[10px] text-slate-400 dark:text-slate-600 font-medium tracking-wide">
    <p>
      Made with <span class="text-red-500">❤</span> using Nuxt 4. Version v{{ version }}
    </p>
  </footer>
</template>
