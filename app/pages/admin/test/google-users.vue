<script setup lang="ts">
const { data: result, pending, error } = await useFetch('/api/test/google-users')
</script>

<template>
  <div class="p-8 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Teste Google Workspace</h1>
      <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left-20-solid">Voltar</UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Lista de Usuários (DWD Test)</h2>
          <UBadge v-if="result?.success" color="green" variant="subtle">Sucesso</UBadge>
          <UBadge v-else color="red" variant="subtle">Erro</UBadge>
        </div>
        <p v-if="result?.subject_used" class="text-xs text-slate-500 mt-1">
          Impersonating: {{ result.subject_used }} (Set ROOT_USER_EMAIL env var to change)
        </p>
      </template>

      <div v-if="pending" class="flex justify-center p-8">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-slate-400" />
      </div>

      <div v-else-if="error" class="text-red-500 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
        <p class="font-bold">Erro na requisição:</p>
        <pre class="text-xs mt-2 overflow-auto">{{ error }}</pre>
      </div>

      <div v-else-if="!result?.success" class="text-red-500 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
        <p class="font-bold">Erro na API do Google:</p>
        <p>{{ result?.error }}</p>
        <pre class="text-xs mt-2 overflow-auto bg-white dark:bg-slate-900 p-2 rounded border border-red-100">{{
          result?.details }}</pre>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
            <tr>
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Detalhes (Org)</th>
              <th class="px-4 py-3">Departamento</th>
              <th class="px-4 py-3">Admin?</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in result.users" :key="user.id"
              class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="px-4 py-3 font-medium">{{ user.name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ user.email }}</td>
              <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                <div v-if="user.organizations && user.organizations.length">
                  <div v-for="(org, idx) in user.organizations" :key="idx">
                    <span v-if="org.title" class="font-semibold block">{{ org.title }}</span>
                    <span v-if="org.description" class="text-slate-400 block">{{ org.description }}</span>
                  </div>
                </div>
                <span v-else class="italic opacity-50">-</span>
              </td>
              <td class="px-4 py-3 text-slate-500 text-xs">
                {{user.organizations?.find(o => o.primary)?.department || user.organizations?.[0]?.department || '-'
                }}
              </td>
              <td class="px-4 py-3">
                <UBadge v-if="user.isAdmin" color="amber" size="xs">Admin</UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge :color="user.suspended ? 'red' : 'green'" size="xs" variant="subtle">
                  {{ user.suspended ? 'Suspenso' : 'Ativo' }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mt-4 text-xs text-slate-400 text-right">
          Total: {{ result.count }} usuários
        </div>
      </div>
    </UCard>
  </div>
</template>
