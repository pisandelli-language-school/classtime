<script setup lang="ts">
// Disable default layout to have a clean slate
definePageMeta({
  layout: false
})

const supabase = useSupabaseClient()
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/confirm',
    },
  })
  if (error) {
    console.error(error)
    loading.value = false
  }
}
</script>

<template>
  <div
    class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased min-h-screen flex flex-col relative overflow-hidden">
    <!-- Background Decoration -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <!-- Abstract gradient blob using primary color -->
      <div
        class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none">
      </div>
      <div
        class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none">
      </div>
      <!-- Subtle Pattern Overlay -->
      <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style="background-image: radial-gradient(#0984e3 1px, transparent 1px); background-size: 32px 32px;"></div>
    </div>

    <!-- Main Content Container -->
    <main class="flex-grow flex items-center justify-center p-4 relative z-10">
      <!-- Login Card -->
      <div
        class="w-full max-w-[420px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/10 shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
        <!-- Card Header / Brand -->
        <div class="pt-10 pb-2 px-8 flex flex-col items-center text-center">
          <div class="mb-6">
            <!-- Replaced Google Icon with SVG Logo -->
            <img src="/logo.svg" alt="ClassTime Logo" class="w-60" />
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-[280px]">
            Bem-vindo de volta. Faça login para registrar suas horas de aula.
          </p>
        </div>

        <!-- Action Area -->
        <div class="px-8 py-8 w-full">
          <!-- Google Sign In Button -->
          <button @click="handleLogin" :disabled="loading"
            class="group w-full flex items-center justify-center gap-3 bg-white dark:bg-[#000000] hover:bg-slate-50 dark:hover:bg-[#111] text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-full h-12 px-6 transition-all duration-200 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-[#0984e3]/50 focus:outline-none focus:ring-2 focus:ring-[#0984e3] focus:ring-offset-2 dark:focus:ring-offset-[#0f172a] disabled:opacity-50 disabled:cursor-not-allowed">
            <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"></path>
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"></path>
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"></path>
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"></path>
            </svg>
            <span class="font-bold text-sm tracking-wide">{{ loading ? 'Entrando...' : 'Entrar com Google' }}</span>
          </button>

          <!-- Domain Restriction Helper -->
          <div class="mt-6 flex flex-col items-center gap-2">
            <p class="text-slate-500 dark:text-slate-400 text-xs text-center font-medium">
              Restrito apenas para contas <span
                class="font-bold text-slate-700 dark:text-slate-200">@pisandelli.com</span>.
            </p>
          </div>
        </div>

        <!-- Footer Note -->
        <div
          class="bg-slate-50 dark:bg-[#020617] border-t border-slate-100 dark:border-[#1e293b] py-4 px-6 flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-slate-400 dark:text-[#64748b] text-[16px]">lock</span>
          <span class="text-xs font-semibold text-slate-400 dark:text-[#64748b] uppercase tracking-wider">Protegido por
            Pisandelli IT</span>
        </div>
      </div>
    </main>

    <!-- Simple Footer Links -->
    <footer class="absolute bottom-4 w-full text-center z-10 pointer-events-none">
      <div class="pointer-events-auto inline-flex gap-6 text-xs text-slate-400 dark:text-slate-600">
        <a class="hover:text-[#0984e3] transition-colors" href="#">Ajuda</a>
        <a class="hover:text-[#0984e3] transition-colors" href="#">Privacidade</a>
        <a class="hover:text-[#0984e3] transition-colors" href="#">Termos</a>
      </div>
    </footer>
  </div>
</template>
