import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferNavigation, { NavigationModule } from '../../src/vue/modules/navigation';
import type { ModuleHost } from '../../src/vue/module-host';

function mountNav(count = 5) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [NavigationModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferNavigation),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('navigation module + <SurferNavigation>', () => {
  it('next/prev buttons drive the host', async () => {
    const { wrapper, getHost } = mountNav();
    await flushPromises();
    await wrapper.find('.v-surfer-button-next').trigger('click');
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(1);
    await wrapper.find('.v-surfer-button-prev').trigger('click');
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('prev is disabled at the beginning, next at the end', async () => {
    const { wrapper, getHost } = mountNav(2);
    await flushPromises();
    expect(wrapper.find('.v-surfer-button-prev').classes()).toContain('v-surfer-button-disabled');
    getHost().goTo(1, { speed: 0 });
    await flushPromises();
    expect(wrapper.find('.v-surfer-button-next').classes()).toContain('v-surfer-button-disabled');
    wrapper.unmount();
  });
});
