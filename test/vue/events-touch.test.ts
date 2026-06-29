import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountSurfer() {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, threshold: 0 },
    slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
  });
}

function down(el: Element, x = 200): void {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: x, clientY: 100 }),
  );
}
function move(el: Element, x: number): void {
  el.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: x, clientY: 100 }),
  );
}
function up(x = 200): void {
  document.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: x, clientY: 100 }),
  );
}

describe('Vue touch events', () => {
  it('emits touchStart on pointerdown', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    down(wrapper.findAll('.v-surfer-slide')[0].element);
    expect(wrapper.emitted('touchStart')).toBeTruthy();
    up();
    wrapper.unmount();
  });

  it('emits touchMove + sliderFirstMove + sliderMove on a moving drag', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[0].element;
    down(slide);
    move(slide, 120);
    expect(wrapper.emitted('touchMove')).toBeTruthy();
    expect(wrapper.emitted('sliderFirstMove')).toBeTruthy();
    expect(wrapper.emitted('sliderMove')).toBeTruthy();
    up(120);
    wrapper.unmount();
  });

  it('emits touchEnd + tap + click on a no-move pointerup', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    down(wrapper.findAll('.v-surfer-slide')[0].element);
    up(200); // no move → allowClick stays true → tap
    expect(wrapper.emitted('touchEnd')).toBeTruthy();
    expect(wrapper.emitted('tap')).toBeTruthy();
    expect(wrapper.emitted('click')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits doubleTap on two quick taps', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[0].element;
    down(slide);
    up(200);
    down(slide);
    up(200);
    expect(wrapper.emitted('doubleTap')).toBeTruthy();
    wrapper.unmount();
  });
});
