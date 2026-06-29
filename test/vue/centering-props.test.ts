import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

// 2 slides @ slidesPerView 3 in a 300 container (size 100 each) → total 200 < 300.
// centerInsufficientSlides → off 50 → snapGrid [0] becomes [-50].
function mountCentering(props: Record<string, unknown>) {
  let host: ModuleHost | null = null;
  wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 3,
      spaceBetween: 0,
      ...props,
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: { default: () => Array.from({ length: 2 }, (_, i) => h(Item, { data: i, key: i })) },
  });
  const el = wrapper.element as HTMLElement;
  Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 200, configurable: true });
  return { getHost: () => host! };
}

describe('KitSurfer centering props', () => {
  it('forwards centerInsufficientSlides to the engine (snapGrid shifts)', async () => {
    const { getHost } = mountCentering({ centerInsufficientSlides: true });
    await flushPromises();
    expect(getHost().state.value.snapGrid).toEqual([-50]);
  });

  it('without the prop the snapGrid is not shifted', async () => {
    const { getHost } = mountCentering({});
    await flushPromises();
    expect(getHost().state.value.snapGrid).toEqual([0]);
  });
});
