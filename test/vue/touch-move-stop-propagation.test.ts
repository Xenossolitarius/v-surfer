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

// Begin a drag, then dispatch a bubbling pointermove on the slide; report whether it
// reached a window-level listener (i.e. propagation was NOT stopped).
function dragReachesWindow(wrapper: VueWrapper): boolean {
  let reached = false;
  const onWin = (): void => {
    reached = true;
  };
  window.addEventListener('pointermove', onWin);
  const slide = wrapper.findAll('.v-surfer-slide')[0].element;
  slide.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
  );
  slide.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
  window.removeEventListener('pointermove', onWin);
  return reached;
}

describe('touchMoveStopPropagation', () => {
  it('stops pointermove propagation to the window when on', async () => {
    const wrapper = mountSurfer({ touchMoveStopPropagation: true });
    await flushPromises();
    expect(dragReachesWindow(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it('lets pointermove propagate by default', async () => {
    const wrapper = mountSurfer({});
    await flushPromises();
    expect(dragReachesWindow(wrapper)).toBe(true);
    wrapper.unmount();
  });
});
