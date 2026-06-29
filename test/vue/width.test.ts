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

describe('width', () => {
  it('writes a fixed container width', async () => {
    const { wrapper } = mountSurfer({ width: 250 });
    await flushPromises();
    expect((wrapper.element as HTMLElement).style.width).toBe('250px');
    wrapper.unmount();
  });

  it('uses width as the horizontal geometry container size', async () => {
    const { wrapper, host } = mountSurfer({ width: 500 });
    await flushPromises();
    expect(host().engine.state.size).toBe(500);
    wrapper.unmount();
  });

  it('still sets height alongside width (shared helper) without clobbering', async () => {
    const { wrapper } = mountSurfer({ width: 250, height: 200, direction: 'vertical' });
    await flushPromises();
    const el = wrapper.element as HTMLElement;
    expect(el.style.width).toBe('250px');
    expect(el.style.height).toBe('200px');
    wrapper.unmount();
  });
});
