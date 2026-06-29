import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { createEngine } from '../../src/headless/engine';
import type { ModuleHost } from '../../src/vue/module-host';

describe('kit ↔ engine parity (non-loop)', () => {
  it('kit Surfer reaches the same snap state as a bare engine', async () => {
    const count = 6;
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: { slidesPerView: 1, spaceBetween: 0, onReady: (h2: ModuleHost) => (host = h2) },
      slots: {
        default: () => Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
      },
    });
    await flushPromises();

    const bare = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    bare.setGeometry({ containerSize: 800 });
    bare.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));

    for (const i of [0, 1, 3, 5, 2, 0]) {
      host!.goTo(i, { speed: 0 });
      bare.slideTo(i, { speed: 0 });
      await flushPromises();
      expect(host!.state.value.activeIndex).toBe(bare.state.activeIndex);
      expect(host!.state.value.translate).toBeCloseTo(bare.state.translate, 6);
      expect(host!.state.value.snapGrid).toEqual(bare.state.snapGrid);
    }
    wrapper.unmount();
  });
});
