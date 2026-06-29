import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

function mountSurfer(props: Record<string, unknown> = {}) {
  let host: ModuleHost | undefined;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      onReady: (h2: ModuleHost) => (host = h2),
      ...props,
    },
    slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
  });
  return { wrapper, host: () => host! };
}

describe('height', () => {
  it('writes a fixed container height', async () => {
    const { wrapper } = mountSurfer({ height: 250 });
    await flushPromises();
    expect((wrapper.element as HTMLElement).style.height).toBe('250px');
    wrapper.unmount();
  });

  it('uses height as the vertical geometry container size', async () => {
    const { wrapper, host } = mountSurfer({ direction: 'vertical', height: 200 });
    await flushPromises();
    expect(host().engine.state.size).toBe(200);
    wrapper.unmount();
  });
});

describe('resizeObserver: false', () => {
  it('re-measures on a window resize', async () => {
    const { wrapper, host } = mountSurfer({ resizeObserver: false });
    await flushPromises();
    // Shrink the container, then fire a window resize: the fallback listener re-measures.
    Object.defineProperty(wrapper.element, 'clientWidth', { value: 500, configurable: true });
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    expect(host().engine.state.size).toBe(500);
    wrapper.unmount();
  });
});
