import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { useSurferHost } from '../../src/vue/module-host';

function setup(params: Record<string, unknown> = {}, slideCount = 5) {
  const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, ...params });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
      },
    });
  return { host, doMount };
}

describe('properties — params / width / height', () => {
  it('exposes resolved params and container dimensions', async () => {
    const { host, doMount } = setup({ slidesPerView: 2, spaceBetween: 10 });
    const wrapper = doMount();
    await flushPromises();
    expect(host.params.slidesPerView).toBe(2);
    expect(host.params.spaceBetween).toBe(10);
    expect(host.width).toBe(800); // dom-shim clientWidth stub
    expect(host.height).toBe(400); // dom-shim clientHeight stub
    wrapper.unmount();
    host.dispose();
  });
});

describe('properties — frozen-named host computeds', () => {
  it('mirror the engine snapshot fields', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(host.previousIndex.value).toBe(0);
    expect(host.progress.value).toBe(0);
    expect(host.isBeginning.value).toBe(true);
    expect(host.isEnd.value).toBe(false);
    expect(host.isLocked.value).toBe(false);
    expect(Array.isArray(host.snapGrid.value)).toBe(true);
    host.goTo(2);
    await flushPromises();
    expect(host.previousIndex.value).toBe(0);
    expect(host.snapIndex.value).toBe(2);
    expect(host.animating.value === true || host.animating.value === false).toBe(true);
    wrapper.unmount();
    host.dispose();
  });
});

describe('properties — clickedIndex / clickedSlide', () => {
  it('records the tapped slide and resets on an empty-space tap', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const slideEl = wrapper.findAll('.v-surfer-slide')[1].element as HTMLElement;

    // A tap (pointerdown+up with no movement) on slide index 1.
    slideEl.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 50, bubbles: true }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, clientX: 400, clientY: 50, bubbles: true }),
    );
    await flushPromises();
    expect(host.clickedIndex.value).toBe(1);
    expect(host.clickedSlide.value).toBe(slideEl);

    // A tap whose pointerdown target is the surfer container itself (not inside any
    // .v-surfer-slide) — the empty-space case — should reset clickedIndex/clickedSlide.
    const containerEl = wrapper.element as HTMLElement;
    containerEl.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 2, clientX: 0, clientY: 0, bubbles: true }),
    );
    document.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 2, clientX: 0, clientY: 0, bubbles: true }),
    );
    await flushPromises();
    expect(host.clickedIndex.value).toBe(-1);
    expect(host.clickedSlide.value).toBeNull();

    wrapper.unmount();
    host.dispose();
  });
});
