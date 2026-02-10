import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import ContractEditModal from '../../app/components/ContractEditModal.vue';
import { ref, nextTick } from 'vue';

// Mock store data
const mockTeachers = ref([{ dbId: 't1', name: 'Teacher 1' }]);
const mockFetchUsers = vi.fn(() => Promise.resolve());

// Mock auto-imported store
mockNuxtImport('useUsersStore', () => {
  return () => ({
    teachers: mockTeachers,
    isLoading: ref(false),
    fetchUsers: mockFetchUsers,
  });
});
// Mock generic components
const GlobalMock = { template: '<div><slot /></div>' };
const UInputMock = {
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
};

const toastAddMock = vi.fn();

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock,
  });
});

const USelectMock = {
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  props: ['modelValue'],
};
const UFormMock = {
  template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>',
  props: ['schema', 'state'],
};

describe('Component: ContractEditModal', () => {
  // Mock store data
  const mockTeachers = ref([{ dbId: 't1', name: 'Teacher 1' }]);
  const mockFetchUsers = vi.fn();

  // Stub globals for auto-imports
  vi.stubGlobal('useUsersStore', () => ({
    teachers: mockTeachers,
    isLoading: ref(false),
    fetchUsers: mockFetchUsers,
  }));

  // storeToRefs simple mock: returns the store object itself
  // usage: const { teachers } = storeToRefs(store) -> works if store has teachers property
  vi.stubGlobal('storeToRefs', (s: any) => s);

  const globalConfig = {
    components: {
      UInput: UInputMock,
      USelect: USelectMock,
      UForm: UFormMock,
      UIcon: GlobalMock,
      UButton: GlobalMock,
    },
    stubs: {
      transition: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      '$fetch',
      vi.fn(() => Promise.resolve({})),
    );
  });

  it('should detect VIP contract and pass validation with 1 student', async () => {
    const vipContract = {
      id: 'c1',
      studentId: 's1', // VIP
      student: { name: 'VIP Student' },
      students: [{ name: 'VIP Student' }],
      totalHours: 10,
      weeklyHours: 1,
      startDate: '2023-01-01',
      teacher: { id: 't1' },
    };

    const wrapper = await mountSuspended(ContractEditModal, {
      props: {
        modelValue: true,
        contract: vipContract,
      },
      global: globalConfig,
    });

    await nextTick();

    // Verify type was set to 'Aluno' from 'studentId'
    expect(wrapper.vm.state.type).toBe('Aluno');

    // Attempt submit
    await wrapper.vm.onSubmit();

    await nextTick();

    // Should NOT show error toast about minimum students
    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('mínimo 2 alunos'),
      }),
    );

    // Should show success (mocking $fetch success)
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sucesso',
      }),
    );
  });

  it('should detect Group contract and FAIL validation with < 2 students', async () => {
    const groupContract = {
      id: 'c2',
      classId: 'class1', // Group
      class: { name: 'Group Class' },
      students: [{ name: 'Student 1' }], // Only 1 student
      totalHours: 10,
      weeklyHours: 1,
      startDate: '2023-01-01',
      teacher: { id: 't1' },
    };

    const wrapper = await mountSuspended(ContractEditModal, {
      props: {
        modelValue: true,
        contract: groupContract,
      },
      global: globalConfig,
    });

    await nextTick();

    // Verify type was set to 'Turma'
    expect(wrapper.vm.state.type).toBe('Turma');

    // Attempt submit
    await wrapper.vm.onSubmit();

    // Should SHOW error toast
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('mínimo 2 alunos'),
        color: 'error',
      }),
    );
  });

  it('should pass validation for Group contract with >= 2 students', async () => {
    const groupContractOk = {
      id: 'c3',
      classId: 'class1', // Group
      students: [{ name: 'Student 1' }, { name: 'Student 2' }], // 2 students
      totalHours: 10,
      weeklyHours: 1,
      startDate: '2023-01-01',
      teacher: { id: 't1' },
    };

    const wrapper = await mountSuspended(ContractEditModal, {
      props: {
        modelValue: true,
        contract: groupContractOk,
      },
      global: globalConfig,
    });

    await nextTick();

    expect(wrapper.vm.state.type).toBe('Turma');

    await wrapper.vm.onSubmit();

    expect(toastAddMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'error',
      }),
    );
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sucesso',
      }),
    );
  });
});
