import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferKeyboard, { KeyboardModule } from '../../src/vue/modules/keyboard';
import type { ModuleHost } from '../../src/vue/module-host';

function mountKeyboard(count = 5) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body, // keydown is bound on the document
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [KeyboardModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    // onlyInViewport:false so happy-dom's zeroed getBoundingClientRect doesn't gate it out.
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferKeyboard, { onlyInViewport: false }),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('keyboard module + <SurferKeyboard>', () => {
  afterEach(() => {
    // Ensure any focused element is cleared between tests so focus state doesn't leak.
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  it('ArrowRight advances and ArrowLeft retreats the host', async () => {
    const { wrapper, getHost } = mountKeyboard();
    await flushPromises();
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 39, bubbles: true }));
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 37, bubbles: true }));
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('does nothing when disabled', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [KeyboardModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferKeyboard, { enabled: false, onlyInViewport: false }),
        ],
      },
    });
    await flushPromises();
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 39, bubbles: true }));
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('ignores keydown when a text input is focused', async () => {
    const { wrapper, getHost } = mountKeyboard();
    await flushPromises();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 39, bubbles: true }));
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(0);
    wrapper.unmount();
    input.remove();
  });

  it('unmount removes the document listener — ArrowRight does not advance after unmount', async () => {
    const { wrapper, getHost } = mountKeyboard();
    await flushPromises();
    wrapper.unmount();
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 39, bubbles: true }));
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(0);
  });
});
