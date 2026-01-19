<script setup lang="ts">
const { data: navTree } = await useAsyncData('navigation', () => fetchContentNavigation())

// Extract the 'Help' section children specifically
const helpInfo = computed(() => {
  if (!navTree.value) return []
  // Find the root item for '/help'
  const root = navTree.value.find((item: any) => item._path === '/help')
  if (!root) return []

  // Prepend the root itself as "Visão Geral" to the list of children
  const children = root.children || []
  const filteredChildren = children.filter((child: any) => child._path !== '/help')

  return [
    { _path: '/help', title: 'Visão Geral' },
    ...filteredChildren
  ]
})

const mapPathToName = (path: string, title: string) => {
  if (path === '/help') return 'Visão Geral'
  if (path === '/help/tutorials') return 'Tutoriais'
  return title
}

const route = useRoute()
</script>

<template>
  <div class="flex h-full min-h-screen bg-white dark:bg-slate-900">
    <!-- Sidebar -->
    <aside
      class="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hidden md:block overflow-y-auto">
      <div class="p-6">
        <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">school</span>
          Central de Ajuda
        </h2>

        <nav class="space-y-1">
          <!-- Fallback if empty -->
          <div v-if="helpInfo.length === 0" class="text-sm text-slate-500">
            Nenhum tópico encontrado.
          </div>

          <NuxtLink v-for="child in helpInfo" :key="child._path" :to="child._path"
            class="block px-3 py-2 rounded-md text-sm font-medium transition-colors"
            active-class="bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
            :class="[
              route.path === child._path
                ? ''
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            ]">
            {{ mapPathToName(child._path, child.title) }}
          </NuxtLink>
        </nav>
      </div>

      <div class="p-6 pt-0 mt-4 border-t border-slate-200 dark:border-slate-800">
        <div class="mt-6">
          <NuxtLink to="/"
            class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar ao Sistema
          </NuxtLink>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto w-full">
      <div class="max-w-4xl mx-auto px-6 py-10">
        <div class="prose prose-slate dark:prose-invert max-w-none">
          <ContentDoc />
        </div>
      </div>
    </main>
  </div>
</template>
