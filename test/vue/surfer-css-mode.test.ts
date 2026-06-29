import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

function mountCssMode(onReady?: (h: ModuleHost) => void) {
  return mount(Surfer, {
    props: { slidesPerView: 1, spaceBetween: 0, cssMode: true, onReady },
    slots: {
      default: () =>
        Array.from({ length: 5 }, (_, i) =>
          h(Item, { data: i, key: i }, { default: () => h('div', `S${i}`) }),
        ),
    },
  });
}

describe('<Surfer> cssMode', () => {
  it('renders a scroll container with the css-mode class and no wrapper transform', async () => {
    const wrapper = mountCssMode();
    await flushPromises();
    expect(wrapper.classes()).toContain('v-surfer-css-mode');
    const style = wrapper.find('.v-surfer-wrapper').attributes('style') ?? '';
    expect(style).toContain('overflow');
    expect(style).not.toContain('transform: translate3d');
    wrapper.unmount();
  });

  it('a scroll event updates the engine activeIndex', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountCssMode((h2) => (host = h2));
    await flushPromises();
    const wrapEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    // happy-dom: assign scrollLeft then fire scroll; the adapter feeds it to the engine.
    Object.defineProperty(wrapEl, 'scrollLeft', { value: 1600, configurable: true });
    wrapEl.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(host!.engine.state.activeIndex).toBe(2);
    wrapper.unmount();
  });

  it('slideTo sets the wrapper scroll position', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountCssMode((h2) => (host = h2));
    await flushPromises();
    const wrapEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    let assigned = -1;
    Object.defineProperty(wrapEl, 'scrollLeft', {
      get: () => assigned,
      set: (v: number) => (assigned = v),
      configurable: true,
    });
    host!.engine.slideTo(2, { speed: 0 });
    await flushPromises();
    expect(assigned).toBe(1600); // -translate(-1600)
    wrapper.unmount();
  });
});
