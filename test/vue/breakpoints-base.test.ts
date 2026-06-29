import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

function setWindowWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
}

// breakpoints: { 1000: { slidesPerView: 4 } }, base slidesPerView 1.
// container width is stubbed to 500, window to the per-test value, so the 1000 key
// applies only under the base whose width >= 1000.
function mountBP(props: Record<string, unknown>, count = 6) {
  let host: ModuleHost | null = null;
  wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      breakpoints: { 1000: { slidesPerView: 4 } },
      ...props,
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: { default: () => Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })) },
  });
  // Stub container size AFTER mount but BEFORE the queued nextTick measure() runs
  // (happy-dom otherwise reports a default/zero clientWidth).
  const el = wrapper.element as HTMLElement;
  Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
  return { getHost: () => host! };
}

describe('KitSurfer breakpointsBase', () => {
  it('container base (default): a breakpoint keyed above the container width does NOT apply', async () => {
    setWindowWidth(1200);
    const { getHost } = mountBP({});
    await flushPromises();
    // container 500 < 1000 → key not applied → base slidesPerView
    expect(getHost().state.value.layout.slidesPerView).toBe(1);
  });

  it('window base: the same breakpoint applies against the viewport width', async () => {
    setWindowWidth(1200);
    const { getHost } = mountBP({ breakpointsBase: 'window' });
    await flushPromises();
    // window 1200 >= 1000 → key applied
    expect(getHost().state.value.layout.slidesPerView).toBe(4);
  });

  it('window base: re-measures on window resize', async () => {
    setWindowWidth(1200);
    const { getHost } = mountBP({ breakpointsBase: 'window' });
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(4);

    setWindowWidth(800);
    window.dispatchEvent(new Event('resize'));
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(1); // 800 < 1000
  });

  it('window base with no breakpoints: mounts without throwing, keeps base slidesPerView', async () => {
    setWindowWidth(1200);
    const { getHost } = mountBP({ breakpointsBase: 'window', breakpoints: undefined });
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(1);
  });

  it('reacts to a runtime breakpointsBase change (the watch path, both directions)', async () => {
    setWindowWidth(1200);
    const { getHost } = mountBP({}); // container base, container 500 → key not applied
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(1);

    await wrapper!.setProps({ breakpointsBase: 'window' }); // → window 1200 ≥ 1000
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(4);

    await wrapper!.setProps({ breakpointsBase: 'container' }); // back → container 500 < 1000
    await flushPromises();
    expect(getHost().state.value.layout.slidesPerView).toBe(1);
  });
});
