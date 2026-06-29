import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { defineSurferModule, type ModuleHost } from '../../src/vue/module-host';

// A tiny module that flips the effect fields on, to prove surfer.ts consumes them.
const probe = defineSurferModule<object>()('probe', ({ host }) => {
  host.effectClasses.value = ['v-surfer-fade'];
  host.virtualTranslate.value = true;
  host.paramOverrides.value = { slidesPerView: 1, spaceBetween: 0 };
});

function mountProbe() {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 3,
      spaceBetween: 20,
      modules: [probe],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: { default: () => Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })) },
  });
  return { wrapper, getHost: () => host! };
}

describe('module-host effect fields + render seam', () => {
  it('merges paramOverrides over base params into the engine', async () => {
    const { getHost } = mountProbe();
    await flushPromises();
    // base slidesPerView:3 overridden to 1 → 4 slides, each full container width.
    // EngineState has no slidesPerView field; assert slidesSizesGrid[0] == container width (800 in happy-dom).
    expect(getHost().state.value.slidesSizesGrid[0]).toBe(800);
  });

  it('adds effectClasses to the container and drops the wrapper transform under virtualTranslate', async () => {
    const { wrapper } = mountProbe();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-fade')).toBe(true);
    const wrapperEl = container.querySelector('.v-surfer-wrapper') as HTMLElement;
    expect(wrapperEl.style.transform).toBe('');
  });
});
