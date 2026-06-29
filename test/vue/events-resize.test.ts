import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountSurfer(props: Record<string, unknown> = {}) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, resizeObserver: false, ...props },
    slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
  });
}

describe('resize events', () => {
  it('emits beforeResize + resize on a window resize (resizeObserver:false fallback)', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    expect(wrapper.emitted('beforeResize')).toBeTruthy();
    expect(wrapper.emitted('resize')).toBeTruthy();
    wrapper.unmount();
  });

  it('does not emit resize for the initial mount measure', async () => {
    const wrapper = mountSurfer();
    await flushPromises();
    expect(wrapper.emitted('resize')).toBeFalsy();
    wrapper.unmount();
  });
});
