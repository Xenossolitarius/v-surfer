import { describe, it, expect } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

// Build a surfer whose middle slide hosts a focusable control. `control` chooses the
// element ('input' | 'select' | 'div'); the others render plain text. attachTo: body is
// required so focus()/document.activeElement behave.
function mountWithControl(control: string, props: Record<string, unknown> = {}) {
  return mount(Surfer, {
    attachTo: document.body,
    // threshold: 0 so a single move translates immediately (default 5 spends the first
    // move arming the drag), keeping these tests about focusableElements, not threshold.
    props: { slidesPerView: 1, spaceBetween: 0, grabCursor: true, threshold: 0, ...props },
    slots: {
      default: () =>
        Array.from({ length: 3 }, (_, i) =>
          h(
            Item,
            { data: i, key: i },
            {
              default: () => (i === 1 ? h(control, { class: 'control' }) : `slide ${i}`),
            },
          ),
        ),
    },
  });
}

const transform = (w: VueWrapper): string =>
  (w.find('.v-surfer-wrapper').element as HTMLElement).style.transform;

const REST = 'translate3d(0px, 0px, 0px)';

// Dispatch a left drag of `dx` px that begins on `target`. pointerdown is dispatched on
// the target (so e.target is it); pointermove bubbles to the document handler.
function drag(target: Element, dx: number): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
  );
  target.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: 1,
      bubbles: true,
      clientX: 200 + dx,
      clientY: 100,
    }),
  );
}

describe('focusableElements prop', () => {
  it('defaults to the frozen selector string', () => {
    const wrapper = mountWithControl('div');
    expect(wrapper.props('focusableElements')).toBe(
      'input, select, option, textarea, button, video, label',
    );
    wrapper.unmount();
  });

  it('still swipes when the gesture starts on a non-focusable element (control)', async () => {
    const wrapper = mountWithControl('div');
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    const slide = wrapper.findAll('.v-surfer-slide')[0].element;
    drag(slide, -100);
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });

  it('does not start a drag from a <select>', async () => {
    const wrapper = mountWithControl('select');
    await flushPromises();
    const select = wrapper.find('select.control').element;
    drag(select, -100);
    await flushPromises();
    // No drag: wrapper never translated and the grab cursor never flipped to grabbing.
    expect(transform(wrapper)).toBe(REST);
    expect((wrapper.find('.v-surfer-wrapper').element as HTMLElement).style.cursor).toBe('grab');
    wrapper.unmount();
  });

  it('does not start a drag from an already-focused focusable control', async () => {
    const wrapper = mountWithControl('input');
    await flushPromises();
    const input = wrapper.find('input.control').element as HTMLInputElement;
    input.focus();
    drag(input, -100);
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    expect((wrapper.find('.v-surfer-wrapper').element as HTMLElement).style.cursor).toBe('grab');
    wrapper.unmount();
  });

  it('swallows the swipe when the gesture focuses a control mid-drag', async () => {
    const wrapper = mountWithControl('input');
    await flushPromises();
    const input = wrapper.find('input.control').element as HTMLInputElement;
    // Drag begins while the input is NOT yet focused (activeElement = body), so the drag
    // starts; the browser's pointerdown focuses the input before the move — emulate that
    // by focusing between down and move. The move must then be swallowed (no swipe).
    input.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
    );
    input.focus();
    input.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
    );
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });

  it('disables the feature when focusableElements is empty (focused input still swipes)', async () => {
    const wrapper = mountWithControl('input', { focusableElements: '' });
    await flushPromises();
    const input = wrapper.find('input.control').element as HTMLInputElement;
    input.focus();
    drag(input, -100);
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });
});
