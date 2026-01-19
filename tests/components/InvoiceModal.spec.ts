import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import InvoiceModal from '../../app/components/InvoiceModal.vue';

// Mock generic components to avoid rendering issues
const GlobalMock = { template: '<div><slot /></div>' };
const UInputMock = {
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue'],
};

describe('Component: InvoiceModal', () => {
  const defaultProps = {
    modelValue: true,
    month: 1,
    year: 2023,
    data: {
      teacher: { id: 't1', name: 'Teacher 1', avatar: null },
      summary: { totalHours: 10, amount: 500 },
    },
    initialItems: [],
  };

  const globalConfig = {
    components: {
      UAvatar: GlobalMock,
      UIcon: GlobalMock,
      UButton: GlobalMock,
      UInput: UInputMock,
    },
    stubs: {
      transition: false,
    },
  };

  vi.stubGlobal('$fetch', vi.fn());

  it('should calculate initial total correctly', async () => {
    const wrapper = await mountSuspended(InvoiceModal, {
      props: defaultProps,
      global: globalConfig,
    });

    // Base amount 500 + 0 adjustments
    expect(wrapper.vm.finalTotal).toBe(500);
    expect(wrapper.text()).toContain('500');
  });

  it('should add credit item and update total', async () => {
    const wrapper = await mountSuspended(InvoiceModal, {
      props: defaultProps,
      global: globalConfig,
    });

    // Simulate input
    wrapper.vm.newItem.description = 'Bonus';
    wrapper.vm.newItem.amountInput = '100,00';

    // Add item directly
    wrapper.vm.addItem('CREDIT');

    expect(wrapper.vm.items).toHaveLength(1);
    expect(wrapper.vm.items[0].amount).toBe(100);
    expect(wrapper.vm.finalTotal).toBe(600); // 500 + 100
  });

  it('should add debit item and update total', async () => {
    const wrapper = await mountSuspended(InvoiceModal, {
      props: defaultProps,
      global: globalConfig,
    });

    wrapper.vm.newItem.description = 'Penalty';
    wrapper.vm.newItem.amountInput = '50,00';
    wrapper.vm.addItem('DEBIT');

    expect(wrapper.vm.finalTotal).toBe(450); // 500 - 50
  });

  it('should remove item', async () => {
    const wrapper = await mountSuspended(InvoiceModal, {
      props: {
        ...defaultProps,
        initialItems: [
          { description: 'Existing', amount: 100, type: 'CREDIT' },
        ],
      },
      global: globalConfig,
    });

    expect(wrapper.vm.items).toHaveLength(1);
    expect(wrapper.vm.finalTotal).toBe(600);

    wrapper.vm.removeItem(0);
    expect(wrapper.vm.items).toHaveLength(0);
    expect(wrapper.vm.finalTotal).toBe(500);
  });
});
