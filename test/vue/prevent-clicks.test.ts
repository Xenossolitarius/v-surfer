import { describe, it, expect } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountSurfer(props: Record<string, unknown> = {}) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, threshold: 0, ...props },
    slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
  });
}

function dragMove(w: VueWrapper): void {
  const slide = w.findAll('.v-surfer-slide')[0].element;
  slide.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
  );
  slide.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
  document.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
}

function clickContainer(w: VueWrapper): boolean {
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
  w.element.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe('preventClicks', () => {
  it('prevents a click that follows a real drag', async () => {
    const wrapper = mountSurfer({});
    await flushPromises();
    dragMove(wrapper);
    await flushPromises();
    expect(clickContainer(wrapper)).toBe(true);
    wrapper.unmount();
  });

  it('does not prevent a click without a preceding drag', async () => {
    const wrapper = mountSurfer({});
    await flushPromises();
    expect(clickContainer(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it('preventClicks:false never prevents', async () => {
    const wrapper = mountSurfer({ preventClicks: false });
    await flushPromises();
    dragMove(wrapper);
    await flushPromises();
    expect(clickContainer(wrapper)).toBe(false);
    wrapper.unmount();
  });
});
