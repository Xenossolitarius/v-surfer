import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

// Frozen Surfer Vue supports four positional slots in addition to `default`:
// container-start / wrapper-start / wrapper-end / container-end. These tests pin
// the kit to the same placement.
function mountWith(slots: Record<string, () => unknown>) {
  return mount(Surfer, {
    attachTo: document.body,
    props: { slidesPerView: 1, spaceBetween: 0 },
    slots,
  });
}

const slideItems = (n: number) => Array.from({ length: n }, (_, i) => h(Item, { data: i, key: i }));

describe('vue named slots (frozen parity)', () => {
  it('container-start renders before the wrapper, inside the container', async () => {
    const wrapper = mountWith({
      default: () => slideItems(3),
      'container-start': () => h('div', { class: 'cs' }, 'CS'),
    });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    const wrapEl = container.querySelector('.v-surfer-wrapper')!;
    const cs = container.querySelector('.cs')!;
    expect(cs).toBeTruthy();
    expect(container.firstElementChild).toBe(cs);
    // cs precedes the wrapper in DOM order
    expect(cs.compareDocumentPosition(wrapEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    wrapper.unmount();
  });

  it('container-end renders after the wrapper, inside the container', async () => {
    const wrapper = mountWith({
      default: () => slideItems(3),
      'container-end': () => h('div', { class: 'ce' }, 'CE'),
    });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    const wrapEl = container.querySelector('.v-surfer-wrapper')!;
    const ce = container.querySelector('.ce')!;
    expect(ce).toBeTruthy();
    expect(container.lastElementChild).toBe(ce);
    expect(wrapEl.compareDocumentPosition(ce) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    wrapper.unmount();
  });

  it('wrapper-start renders inside the wrapper before the first slide', async () => {
    const wrapper = mountWith({
      default: () => slideItems(3),
      'wrapper-start': () => h('div', { class: 'ws' }, 'WS'),
    });
    await flushPromises();
    const wrapEl = wrapper.element.querySelector('.v-surfer-wrapper')!;
    const ws = wrapEl.querySelector('.ws')!;
    const firstSlide = wrapEl.querySelector('.v-surfer-slide')!;
    expect(ws).toBeTruthy();
    expect(wrapEl.firstElementChild).toBe(ws);
    expect(ws.compareDocumentPosition(firstSlide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    wrapper.unmount();
  });

  it('wrapper-end renders inside the wrapper after the last slide', async () => {
    const wrapper = mountWith({
      default: () => slideItems(3),
      'wrapper-end': () => h('div', { class: 'we' }, 'WE'),
    });
    await flushPromises();
    const wrapEl = wrapper.element.querySelector('.v-surfer-wrapper')!;
    const we = wrapEl.querySelector('.we')!;
    const slides = wrapEl.querySelectorAll('.v-surfer-slide');
    const lastSlide = slides[slides.length - 1];
    expect(we).toBeTruthy();
    expect(wrapEl.lastElementChild).toBe(we);
    expect(lastSlide.compareDocumentPosition(we) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    wrapper.unmount();
  });

  it('all four slots + slides coexist in the correct order', async () => {
    const wrapper = mountWith({
      'container-start': () => h('div', { class: 'cs' }),
      'wrapper-start': () => h('div', { class: 'ws' }),
      default: () => slideItems(2),
      'wrapper-end': () => h('div', { class: 'we' }),
      'container-end': () => h('div', { class: 'ce' }),
    });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    const wrapEl = container.querySelector('.v-surfer-wrapper')!;
    // container order: cs, wrapper, ce
    const kids = Array.from(container.children);
    expect(kids[0].classList.contains('cs')).toBe(true);
    expect(kids[kids.length - 1].classList.contains('ce')).toBe(true);
    expect(kids.indexOf(wrapEl as Element)).toBeGreaterThan(0);
    // wrapper order: ws, slides..., we
    const wkids = Array.from(wrapEl.children);
    expect(wkids[0].classList.contains('ws')).toBe(true);
    expect(wkids[wkids.length - 1].classList.contains('we')).toBe(true);
    expect(wrapEl.querySelectorAll('.v-surfer-slide').length).toBe(2);
    wrapper.unmount();
  });

  it('non-Item default content (chrome) still renders after the wrapper (unchanged)', async () => {
    const wrapper = mountWith({
      default: () => [...slideItems(2), h('div', { class: 'chrome' }, 'C')],
    });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    const wrapEl = container.querySelector('.v-surfer-wrapper')!;
    const chrome = container.querySelector('.chrome')!;
    expect(chrome).toBeTruthy();
    expect(wrapEl.compareDocumentPosition(chrome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    wrapper.unmount();
  });
});
