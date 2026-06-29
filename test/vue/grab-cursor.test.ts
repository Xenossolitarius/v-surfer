import { describe, it, expect } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountSurfer(props: Record<string, unknown>) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, ...props },
    slots: {
      default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
    },
  });
}

// Read the literal cursor value off the wrapper element (exact, so 'grab' is not
// matched by 'grabbing').
const wrapperCursor = (w: VueWrapper): string =>
  (w.find('.v-surfer-wrapper').element as HTMLElement).style.cursor;

describe('grabCursor prop', () => {
  it('shows grab on the wrapper at rest when grabCursor is on', async () => {
    const wrapper = mountSurfer({ grabCursor: true });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grab');
    wrapper.unmount();
  });

  it('leaves the wrapper cursor unset by default', async () => {
    const wrapper = mountSurfer({});
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('');
    wrapper.unmount();
  });

  it('flips to grabbing while dragging and back to grab on release', async () => {
    const wrapper = mountSurfer({ grabCursor: true });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    container.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grabbing');
    // pointerup is bound on the document (ownerDocument) in surfer.ts.
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grab');
    wrapper.unmount();
  });

  it('does not set a cursor under cssMode even when grabCursor is on', async () => {
    const wrapper = mountSurfer({ grabCursor: true, cssMode: true });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('');
    wrapper.unmount();
  });

  it('reacts to grabCursor toggling at runtime', async () => {
    const wrapper = mountSurfer({ grabCursor: false });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('');
    await wrapper.setProps({ grabCursor: true });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grab');
    await wrapper.setProps({ grabCursor: false });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('');
    wrapper.unmount();
  });

  it('restores grab when a drag is cancelled (pointercancel)', async () => {
    const wrapper = mountSurfer({ grabCursor: true });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    container.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grabbing');
    // pointercancel is bound to the same handler as pointerup on the document.
    document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }));
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grab');
    wrapper.unmount();
  });

  it('clears the cursor when grabCursor is turned off mid-drag', async () => {
    const wrapper = mountSurfer({ grabCursor: true });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    container.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('grabbing');
    await wrapper.setProps({ grabCursor: false });
    await flushPromises();
    expect(wrapperCursor(wrapper)).toBe('');
    wrapper.unmount();
  });
});
