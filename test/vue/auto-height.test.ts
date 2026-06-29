import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

function mountAH(props: Record<string, unknown>, count = 3) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      ...props,
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
    },
  });
  return { wrapper, getHost: () => host! };
}

// happy-dom reports offsetHeight 0; stub each rendered slide with a fixed height.
function stubHeights(wrapper: ReturnType<typeof mount>, heights: number[]) {
  wrapper.findAll('.v-surfer-slide').forEach((s, i) => {
    Object.defineProperty(s.element, 'offsetHeight', { value: heights[i], configurable: true });
  });
}

describe('KitSurfer autoHeight', () => {
  it('sets wrapper height to the active slide height and adds the v-surfer-autoheight class', async () => {
    const { wrapper, getHost } = mountAH({ autoHeight: true });
    await flushPromises();
    stubHeights(wrapper, [100, 250, 150]);
    getHost().goTo(1); // re-measure: active becomes slide 1 (250px)
    await flushPromises();

    expect(wrapper.classes()).toContain('v-surfer-autoheight');
    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.height).toBe('250px');
    wrapper.unmount();
  });

  it('with slidesPerView 2 uses the max of the in-view range', async () => {
    const { wrapper, getHost } = mountAH({ autoHeight: true, slidesPerView: 2 });
    await flushPromises();
    stubHeights(wrapper, [100, 120, 300]);
    getHost().goTo(1); // active 1, spv 2 → range [1,2] → max(120,300)=300
    await flushPromises();

    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.height).toBe('300px');
    wrapper.unmount();
  });

  it('does nothing when autoHeight is off (no height, no class)', async () => {
    const { wrapper, getHost } = mountAH({});
    await flushPromises();
    stubHeights(wrapper, [100, 250, 150]);
    getHost().goTo(1);
    await flushPromises();

    expect(wrapper.classes()).not.toContain('v-surfer-autoheight');
    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.height).toBe('');
    wrapper.unmount();
  });

  it('under virtual, uses the active slide height when the render window starts past 0', async () => {
    // RED→GREEN proof for Fix 1: before the fix, applyAutoHeight indexed slideEls
    // with the full-list activeIndex (e.g. 3) but slideEls only holds the rendered
    // window starting at lo (e.g. 2), so els[3] is undefined → height stays 0px.
    const { wrapper, getHost } = mountAH({ autoHeight: true, virtual: true }, 8);
    await flushPromises();
    // Navigate to slide 3: with slidesPerView=1 the virtual window shifts so lo=2,
    // meaning slideEls = [slide2, slide3, slide4] (window-relative positions 0,1,2).
    getHost().goTo(3);
    await flushPromises();

    // Stub heights: active slide (.v-surfer-slide-active) → 222px; others → 50px.
    wrapper.findAll('.v-surfer-slide').forEach((s) => {
      const isActive = s.element.classList.contains('v-surfer-slide-active');
      Object.defineProperty(s.element, 'offsetHeight', {
        value: isActive ? 222 : 50,
        configurable: true,
      });
    });

    // Re-trigger the state watcher (flush:'post') by navigating to the same slide.
    getHost().goTo(3);
    await flushPromises();

    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.height).toBe('222px');
    wrapper.unmount();
  });

  it('clears wrapper height when autoHeight prop is toggled off', async () => {
    const { wrapper, getHost } = mountAH({ autoHeight: true });
    await flushPromises();
    stubHeights(wrapper, [100, 250, 150]);
    getHost().goTo(1);
    await flushPromises();

    // Confirm height is set before toggling off.
    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.height).not.toBe('');

    // Toggle autoHeight off — the watch(() => props.autoHeight) watcher must clear it.
    await wrapper.setProps({ autoHeight: false });
    await flushPromises();

    expect(wrapperEl.style.height).toBe('');
    wrapper.unmount();
  });
});
