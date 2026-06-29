import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferNavigation, { NavigationModule } from '../../src/vue/modules/navigation';
import type { ModuleHost } from '../../src/vue/module-host';

describe('vue class names from engine fns', () => {
  it('container + slide classes (incl. fully-visible) come from the engine fns', async () => {
    const wrapper = mount(Surfer, {
      props: { slidesPerView: 1, spaceBetween: 0, freeMode: true },
      slots: { default: () => Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })) },
    });
    await flushPromises();
    const container = wrapper.find('.v-surfer');
    expect(container.classes()).toContain('v-surfer-horizontal');
    expect(container.classes()).toContain('v-surfer-free-mode'); // kit now emits it
    const active = wrapper.find('.v-surfer-slide-active');
    expect(active.exists()).toBe(true);
    expect(active.classes()).toContain('v-surfer-slide-visible');
    expect(active.classes()).toContain('v-surfer-slide-fully-visible'); // kit now emits it
    wrapper.unmount();
  });

  it('navigation buttons get disabled/lock from the engine fns', async () => {
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
          ...Array.from({ length: 2 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferNavigation),
        ],
      },
    });
    await flushPromises();
    expect(wrapper.find('.v-surfer-button-prev').classes()).toContain('v-surfer-button-disabled');
    host!.goTo(1, { speed: 0 });
    await flushPromises();
    expect(wrapper.find('.v-surfer-button-next').classes()).toContain('v-surfer-button-disabled');
    wrapper.unmount();
  });
});
