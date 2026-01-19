import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import TimesheetModal from '../../app/components/TimesheetModal.vue';

// Mock generic components
const GlobalMock = { template: '<div><slot /></div>' };
const UInputMock = {
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
};
const UTextareaMock = {
  template:
    '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
};

describe('Component: TimesheetModal', () => {
  const defaultProps = {
    modelValue: true,
    assignments: [
      {
        id: 'a1',
        name: 'Math Class',
        class: {
          name: 'Class A',
          students: [
            { id: 's1', name: 'Student 1' },
            { id: 's2', name: 'Student 2' },
          ],
        },
      },
    ],
  };

  const globalConfig = {
    components: {
      UInput: UInputMock,
      UTextarea: UTextareaMock,
      UIcon: GlobalMock,
    },
  };

  vi.stubGlobal('$fetch', vi.fn());

  it('should calculate duration correctly', async () => {
    const wrapper = await mountSuspended(TimesheetModal, {
      props: defaultProps,
      global: globalConfig,
    });

    // 08:00 to 09:30 = 1.5 hours
    wrapper.vm.state.startTime = '08:00';
    wrapper.vm.state.endTime = '09:30';

    expect(wrapper.vm.calculatedDuration).toBe('1.5');
  });

  it('should validate end time greater than start time', async () => {
    const wrapper = await mountSuspended(TimesheetModal, {
      props: defaultProps,
      global: globalConfig,
    });

    wrapper.vm.state.startTime = '10:00';
    wrapper.vm.state.endTime = '09:00';

    // Trigger validation
    const isValid = wrapper.vm.validateForm();

    expect(isValid).toBe(false);
    expect(wrapper.vm.errors.endTime).toBe(true);
  });

  it('should toggle attendance correctly', async () => {
    const wrapper = await mountSuspended(TimesheetModal, {
      props: defaultProps,
      global: globalConfig,
    });

    // Select subject to populate availableStudents
    wrapper.vm.state.subject = 'a1';

    // Toggle Student 1
    wrapper.vm.toggleAttendance('s1');
    expect(wrapper.vm.state.attendeeIds).toContain('s1');

    // Toggle again to remove
    wrapper.vm.toggleAttendance('s1');
    expect(wrapper.vm.state.attendeeIds).not.toContain('s1');
  });

  it('should validate required fields', async () => {
    const wrapper = await mountSuspended(TimesheetModal, {
      props: defaultProps,
      global: globalConfig,
    });

    const isValid = wrapper.vm.validateForm();

    expect(isValid).toBe(false);
    expect(wrapper.vm.errors.subject).toBe(true);
    expect(wrapper.vm.errors.startTime).toBe(true);
    expect(wrapper.vm.errors.type).toBe(true);
  });
});
