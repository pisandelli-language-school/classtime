import { defineStore } from 'pinia';

export const useUsersStore = defineStore('users', () => {
  const users = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hasLoaded = ref(false);

  const fetchUsers = async (force = false) => {
    if (hasLoaded.value && !force) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Use $fetch for imperative calls inside actions
      const response = await $fetch<{
        success: boolean;
        users?: any[];
        error?: string;
      }>('/api/admin/users');

      if (response && response.success) {
        users.value = response.users || [];
        hasLoaded.value = true;
      } else {
        throw new Error(response?.error || 'Erro desconhecido');
      }
    } catch (e: any) {
      console.error('Users Store Error:', e);
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  const teachers = computed(() => {
    return users.value.filter((u) => u.isTeacher && u.dbId);
  });

  // Helpful for looking up a single user without refetching
  const getUserById = (id: string) =>
    users.value.find((u) => u.dbId === id || u.id === id);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    teachers,
    getUserById,
  };
});
