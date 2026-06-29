import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferMousewheel, { MousewheelModule } from '../../src/vue/modules/mousewheel';
import type { ModuleHost } from '../../src/vue/module-host';

function mountWheel(count = 5, extraSlotNodes: ReturnType<typeof h>[] = []) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [MousewheelModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferMousewheel),
        ...extraSlotNodes,
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('mousewheel module + <SurferMousewheel>', () => {
  it('a wheel event over the container advances the host', async () => {
    const { wrapper, getHost } = mountWheel();
    await flushPromises();
    const container = wrapper.find('.v-surfer').element;
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaX: 0, cancelable: true }));
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(1);
    wrapper.unmount();
  });

  it('does nothing when disabled', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [MousewheelModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferMousewheel, { enabled: false }),
        ],
      },
    });
    await flushPromises();
    wrapper
      .find('.v-surfer')
      .element.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }));
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('wheel inside a .v-surfer-no-mousewheel subtree is ignored', async () => {
    const { wrapper, getHost } = mountWheel();
    await flushPromises();
    // Append a guarded subtree directly to the surfer container so wheel events
    // from it bubble up to the kit's wheel listener on the container.
    const container = wrapper.find('.v-surfer').element;
    const guarded = document.createElement('div');
    guarded.className = 'v-surfer-no-mousewheel';
    container.appendChild(guarded);
    guarded.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 }),
    );
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('free-mode scrubs translate (via setProgress) instead of snapping activeIndex', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [MousewheelModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferMousewheel, { freeMode: true, sensitivity: 1 }),
        ],
      },
    });
    await flushPromises();
    // happy-dom returns clientWidth=0, so the kit's measure() skips setGeometry.
    // Supply geometry manually so setProgress / applyScrub has a real snap grid
    // (same as the headless test's e.setGeometry({ containerSize: 800 })).
    host!.engine.setGeometry({ containerSize: 800 });
    const container = wrapper.find('.v-surfer').element;
    // deltaY: 100 → pixelY 100 → wheelDelta=-100 → targetDelta=-100 (sensitivity 1)
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));
    await flushPromises();
    expect(host!.state.value.translate).toBe(-100);
    expect(host!.state.value.activeIndex).toBe(0); // sub-slide scrub, not snapped
    wrapper.unmount();
  });
});
