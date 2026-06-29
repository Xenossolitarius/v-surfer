import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

// A button is a focusableElements match but not a <select> and not auto-focused, so the
// existing focusableElements guard does NOT early-return on it — exercising the
// focusable-skips-preventDefault and force-overrides paths.
function mountWithButton(props: Record<string, unknown> = {}) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, threshold: 0, ...props },
    slots: {
      default: () =>
        Array.from({ length: 3 }, (_, i) =>
          h(
            Item,
            { data: i, key: i },
            { default: () => (i === 0 ? h('button', { class: 'btn' }) : `s${i}`) },
          ),
        ),
    },
  });
}

// Dispatch a cancelable pointerdown on `target`, return whether default was prevented.
function pointerdown(target: Element): boolean {
  const ev = new PointerEvent('pointerdown', {
    pointerId: 1,
    bubbles: true,
    cancelable: true,
    clientX: 200,
    clientY: 100,
  });
  target.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe('touchStartPreventDefault', () => {
  it('prevents default on a normal slide by default', async () => {
    const wrapper = mountWithButton({});
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[1].element; // the "s1" slide, non-focusable
    expect(pointerdown(slide)).toBe(true);
    wrapper.unmount();
  });

  it('does not prevent default on a focusable (button) target', async () => {
    const wrapper = mountWithButton({});
    await flushPromises();
    expect(pointerdown(wrapper.find('button.btn').element)).toBe(false);
    wrapper.unmount();
  });

  it('does not prevent default when touchStartPreventDefault is false', async () => {
    const wrapper = mountWithButton({ touchStartPreventDefault: false });
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[1].element;
    expect(pointerdown(slide)).toBe(false);
    wrapper.unmount();
  });

  it('touchStartForcePreventDefault prevents even on a focusable (button) target', async () => {
    const wrapper = mountWithButton({ touchStartForcePreventDefault: true });
    await flushPromises();
    expect(pointerdown(wrapper.find('button.btn').element)).toBe(true);
    wrapper.unmount();
  });
});
