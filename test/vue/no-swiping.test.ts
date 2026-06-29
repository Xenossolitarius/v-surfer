import { describe, it, expect } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountWith(inner: { class?: string }, props: Record<string, unknown> = {}) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0, threshold: 0, ...props },
    slots: {
      default: () =>
        Array.from({ length: 3 }, (_, i) =>
          h(Item, { data: i, key: i }, { default: () => (i === 0 ? h('div', inner) : `s${i}`) }),
        ),
    },
  });
}

const transform = (w: VueWrapper): string =>
  (w.find('.v-surfer-wrapper').element as HTMLElement).style.transform;
const REST = 'translate3d(0px, 0px, 0px)';

function drag(target: Element): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
  );
  target.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
}

describe('noSwiping family', () => {
  it('does not drag when the gesture starts inside .v-surfer-no-swiping', async () => {
    const wrapper = mountWith({ class: 'v-surfer-no-swiping' });
    await flushPromises();
    drag(wrapper.find('.v-surfer-no-swiping').element);
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });

  it('drags normally from an element without the class', async () => {
    const wrapper = mountWith({ class: 'plain' });
    await flushPromises();
    drag(wrapper.find('.plain').element);
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });

  it('noSwipingSelector overrides the class', async () => {
    const wrapper = mountWith({ class: 'lock' }, { noSwipingSelector: '.lock' });
    await flushPromises();
    drag(wrapper.find('.lock').element);
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });

  it('noSwiping:false disables the guard', async () => {
    const wrapper = mountWith({ class: 'v-surfer-no-swiping' }, { noSwiping: false });
    await flushPromises();
    drag(wrapper.find('.v-surfer-no-swiping').element);
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });
});
