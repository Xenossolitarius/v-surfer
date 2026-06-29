import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

function mountSurfer() {
  let host: ModuleHost | undefined;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      threshold: 0,
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: { default: () => Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })) },
  });
  return { wrapper, host: () => host! };
}

describe('Vue event forwarding', () => {
  it('forwards engine state events to Vue emit', async () => {
    const { wrapper, host } = mountSurfer();
    await flushPromises();
    host().engine.slideTo(2, { speed: 0 });
    await flushPromises();
    expect(wrapper.emitted('slideChange')).toBeTruthy();
    expect(wrapper.emitted('activeIndexChange')).toBeTruthy();
    expect(wrapper.emitted('setTranslate')).toBeTruthy();
    wrapper.unmount();
  });

  it('forwards transition events with a speed>0 nav', async () => {
    const { wrapper, host } = mountSurfer();
    await flushPromises();
    host().engine.slideNext({ speed: 300 });
    await flushPromises();
    expect(wrapper.emitted('transitionStart')).toBeTruthy();
    expect(wrapper.emitted('slideNextTransitionStart')).toBeTruthy();
    wrapper.unmount();
  });

  it('passes the numeric arg through for setTranslate', async () => {
    const { wrapper, host } = mountSurfer();
    await flushPromises();
    host().engine.slideTo(1, { speed: 0 });
    await flushPromises();
    const ev = wrapper.emitted('setTranslate');
    expect(typeof (ev![0] as unknown[])[0]).toBe('number');
    wrapper.unmount();
  });
});
