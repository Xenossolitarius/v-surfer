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

function drag(target: Element, pointerType = 'touch'): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      bubbles: true,
      clientX: 200,
      clientY: 100,
      pointerType,
    }),
  );
  target.dispatchEvent(
    new PointerEvent('pointermove', {
      pointerId: 1,
      bubbles: true,
      clientX: 100,
      clientY: 100,
      pointerType,
    }),
  );
}

function clickContainer(w: VueWrapper): boolean {
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
  w.element.dispatchEvent(ev);
  return ev.defaultPrevented;
}

function dragMove(w: VueWrapper): void {
  const slide = w.findAll('.v-surfer-slide')[0].element;
  slide.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
  );
  slide.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
  document.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 100, clientY: 100 }),
  );
}

describe('grouped noSwiping prop', () => {
  it('noSwiping.selector blocks a gesture inside the match', async () => {
    const wrapper = mountWith({ class: 'lock' }, { noSwiping: { selector: '.lock' } });
    await flushPromises();
    drag(wrapper.find('.lock').element);
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });

  it('noSwiping.enabled=false disables the guard', async () => {
    const wrapper = mountWith({ class: 'v-surfer-no-swiping' }, { noSwiping: { enabled: false } });
    await flushPromises();
    drag(wrapper.find('.v-surfer-no-swiping').element);
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });

  it('noSwiping.class overrides the default class', async () => {
    const wrapper = mountWith({ class: 'guard' }, { noSwiping: { class: 'guard' } });
    await flushPromises();
    drag(wrapper.find('.guard').element);
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });
});

describe('grouped preventClicks prop', () => {
  it('preventClicks.enabled=false never prevents', async () => {
    const wrapper = mountWith({ class: 'plain' }, { preventClicks: { enabled: false } });
    await flushPromises();
    dragMove(wrapper);
    await flushPromises();
    expect(clickContainer(wrapper)).toBe(false);
    wrapper.unmount();
  });

  it('preventClicks object form still prevents a post-drag click by default', async () => {
    const wrapper = mountWith({ class: 'plain' }, { preventClicks: { propagation: false } });
    await flushPromises();
    dragMove(wrapper);
    await flushPromises();
    expect(clickContainer(wrapper)).toBe(true);
    wrapper.unmount();
  });
});

describe('grouped touch prop affects component gesture logic', () => {
  it('touch.simulate=false ignores a mouse drag', async () => {
    const wrapper = mountWith({ class: 'plain' }, { touch: { simulate: false } });
    await flushPromises();
    drag(wrapper.find('.plain').element, 'mouse');
    await flushPromises();
    expect(transform(wrapper)).toBe(REST);
    wrapper.unmount();
  });

  it('touch.simulate=false still allows a touch drag', async () => {
    const wrapper = mountWith({ class: 'plain' }, { touch: { simulate: false } });
    await flushPromises();
    drag(wrapper.find('.plain').element, 'touch');
    await flushPromises();
    expect(transform(wrapper)).not.toBe(REST);
    wrapper.unmount();
  });
});
