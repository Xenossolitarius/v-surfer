import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferScrollbar, { ScrollbarModule } from '../../src/vue/modules/scrollbar';
import type { ModuleHost } from '../../src/vue/module-host';

function mountScrollbar(count = 5, sbProps: Record<string, unknown> = {}) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [ScrollbarModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferScrollbar, sbProps),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('scrollbar module + <SurferScrollbar>', () => {
  it('renders a track and a thumb with a size style', async () => {
    const { wrapper } = mountScrollbar();
    await flushPromises();
    expect(wrapper.find('.v-surfer-scrollbar').exists()).toBe(true);
    const drag = wrapper.find('.v-surfer-scrollbar-drag');
    expect(drag.exists()).toBe(true);
    // happy-dom reports 800px boxes; the thumb gets a width (horizontal) style.
    expect(drag.attributes('style') ?? '').toMatch(/width|height/);
  });

  it('thumb offset advances when the host navigates', async () => {
    const { wrapper, getHost } = mountScrollbar();
    await flushPromises();
    const before = wrapper.find('.v-surfer-scrollbar-drag').attributes('style') ?? '';
    getHost().goTo(4, { speed: 0 });
    await flushPromises();
    const after = wrapper.find('.v-surfer-scrollbar-drag').attributes('style') ?? '';
    expect(after).not.toBe(before);
    wrapper.unmount();
  });

  it('single-slide engine adds lock class and hides the scrollbar', async () => {
    const { wrapper } = mountScrollbar(1);
    await flushPromises();
    const track = wrapper.find('.v-surfer-scrollbar');
    expect(track.exists()).toBe(true);
    expect(track.classes()).toContain('v-surfer-scrollbar-lock');
    expect((track.element as HTMLElement).style.display).toBe('none');
    wrapper.unmount();
  });

  it('draggable false: pointer drag does not change translate or activeIndex', async () => {
    const { wrapper, getHost } = mountScrollbar(5, { draggable: false });
    await flushPromises();
    const track = wrapper.find('.v-surfer-scrollbar').element as HTMLElement;
    const beforeTranslate = getHost().state.value.translate;
    const beforeIndex = getHost().state.value.activeIndex;
    track.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 640, clientY: 0, pointerId: 1, bubbles: true }),
    );
    await flushPromises();
    expect(getHost().state.value.translate).toBe(beforeTranslate);
    expect(getHost().state.value.activeIndex).toBe(beforeIndex);
    wrapper.unmount();
  });

  it('snapOnRelease: releasing after drag snaps activeIndex to a whole slide', async () => {
    const { wrapper, getHost } = mountScrollbar(5, { snapOnRelease: true });
    await flushPromises();
    const track = wrapper.find('.v-surfer-scrollbar').element as HTMLElement;
    // Drag to ~80% of track (clientX 640 of 800px shimmed width) → setProgress(0.8) → near slide 3
    track.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 640, clientY: 0, pointerId: 1, bubbles: true }),
    );
    expect(getHost().state.value.activeIndex).toBeGreaterThan(0);
    // Release: slideToClosest() snaps translate to a slide boundary (multiple of 800)
    document.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 640, clientY: 0, pointerId: 1, bubbles: true }),
    );
    await flushPromises();
    expect(Math.abs(getHost().state.value.translate % 800)).toBe(0);
    wrapper.unmount();
  });
});
