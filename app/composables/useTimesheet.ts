export default function useTimesheet() {
  const timesheet = ref<any>(null);
  const assignments = ref<any[]>([]);
  const userRole = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<any>(null);

  // State for navigation
  const currentDate = ref(new Date());

  // Derived month/year for API
  const currentMonth = computed(() => currentDate.value.getMonth() + 1);
  const currentYear = computed(() => currentDate.value.getFullYear());

  // Fetch timesheet based on currentDate
  const fetchCurrentTimesheet = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch('/api/timesheets/current', {
        query: {
          month: currentMonth.value,
          year: currentYear.value,
        },
      });

      timesheet.value = response.timesheet || null;
      assignments.value = response.assignments || [];
      userRole.value = response.userRole || null;
    } catch (e) {
      error.value = e;
      console.error('Error fetching timesheet:', e);
    } finally {
      loading.value = false;
    }
  };

  const navigateMonth = (offset: number) => {
    const newDate = new Date(currentDate.value);
    newDate.setMonth(newDate.getMonth() + offset);
    currentDate.value = newDate;
  };

  // Refetch when date changes
  watch(currentDate, () => {
    fetchCurrentTimesheet();
  });

  // Computed totals
  const totalHours = computed(() => {
    if (!timesheet.value?.entries) return 0;
    return timesheet.value.entries.reduce(
      (acc: number, curr: any) => acc + Number(curr.duration),
      0
    );
  });

  // Status helpers
  const isDraft = computed(() => timesheet.value?.status === 'DRAFT');
  const isSubmitted = computed(() => timesheet.value?.status === 'SUBMITTED');
  const isApproved = computed(() => timesheet.value?.status === 'APPROVED');
  const isRejected = computed(() => timesheet.value?.status === 'REJECTED');
  const rejectionReason = computed(() => timesheet.value?.rejectionReason);

  // Role helper
  const isManager = computed(() => {
    const data = useNuxtApp().payload.data;
    // Access state directly from the useFetch key
    // But since we destructured, we can just look at userRole if we returned it?
    // Wait, fetchCurrentTimesheet updates 'timesheet' and 'assignments' refs.
    // It doesn't update a 'userRole' ref because we didn't destructure it in the composable yet.
    // Let's create a userRole state.
    return userRole.value === 'MANAGER' || userRole.value === 'ROOT';
  });

  return {
    timesheet,
    assignments,
    loading,
    error,
    fetchCurrentTimesheet,
    totalHours,
    isDraft,
    isSubmitted,
    isApproved,
    isRejected,
    rejectionReason,
    isManager,
    currentDate,
    navigateMonth,
    currentMonth,
    currentYear,
  };
}
