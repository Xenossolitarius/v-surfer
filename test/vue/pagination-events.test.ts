import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import Pagination, { PaginationModule } from '../../src/vue/modules/pagination';
import { useSurferHost } from '../../src/vue/module-host';

// Build the host (so a test can subscribe BEFORE mount — paginationRender fires on mount), and a
// deferred mount fn. h(Pagination) is slot "chrome" rendered inside <KitSurfer>.
function setup(hostExtra: Record<string, unknown> = {}, slideCount = 3) {
  const host = useSurferHost({
    slidesPerView: 1,
    spaceBetween: 0,
    modules: [PaginationModule],
    ...hostExtra,
  });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => [
          ...Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
          h(Pagination),
        ],
      },
    });
  return { host, doMount };
}

describe('pagination render event', () => {
  it('emits paginationRender on mount — on the host bus and on the component, with the root el payload', async () => {
    const { host, doMount } = setup();
    const captured: unknown[] = [];
    host.on('paginationRender', (el) => captured.push(el)); // subscribe BEFORE mount
    const wrapper = doMount();
    await flushPromises();
    const rootEl = wrapper.find('.v-surfer-pagination').element;
    expect(captured[0]).toBe(rootEl);
    const ev = wrapper.findComponent(Pagination).emitted('paginationRender');
    expect(ev).toBeTruthy();
    expect(ev![0][0]).toBe(rootEl);
    wrapper.unmount();
    host.dispose();
  });

  it('does NOT surface paginationRender on <KitSurfer> (component separation)', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(wrapper.emitted('paginationRender')).toBeFalsy();
    wrapper.unmount();
    host.dispose();
  });
});

describe('pagination update + structural re-render', () => {
  it('emits paginationUpdate (with the root el) on a content change', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const updated: unknown[] = [];
    host.on('paginationUpdate', (el) => updated.push(el)); // subscribe after mount → isolate slideTo
    host.engine.slideTo(1);
    await flushPromises();
    const rootEl = wrapper.find('.v-surfer-pagination').element;
    expect(updated.length).toBeGreaterThan(0);
    expect(updated[updated.length - 1]).toBe(rootEl);
    wrapper.unmount();
    host.dispose();
  });

  it('re-fires paginationRender on a bullet-count (structural) change', async () => {
    const { host, doMount } = setup({}, 3);
    const wrapper = doMount();
    await flushPromises();
    const renders: unknown[] = [];
    host.on('paginationRender', (el) => renders.push(el)); // subscribe after mount → isolate the rebuild
    host.engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    await flushPromises();
    expect(renders.length).toBeGreaterThan(0);
    wrapper.unmount();
    host.dispose();
  });
});

describe('pagination hideOnClick + show/hide', () => {
  it('toggles hiddenClass on the pagination root and emits hide then show', async () => {
    const { host, doMount } = setup({ config: { pagination: { hideOnClick: true } } });
    const wrapper = doMount();
    await flushPromises();
    const fired: string[] = [];
    host.on('paginationHide', () => fired.push('hide'));
    host.on('paginationShow', () => fired.push('show'));
    // Click a non-bullet target inside the container (the wrapper bubbles to the container listener).
    const wrapperEl = wrapper.find('.v-surfer-wrapper').element;

    wrapperEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(
      wrapper.find('.v-surfer-pagination').element.classList.contains('v-surfer-pagination-hidden'),
    ).toBe(true);

    wrapperEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(
      wrapper.find('.v-surfer-pagination').element.classList.contains('v-surfer-pagination-hidden'),
    ).toBe(false);

    expect(fired).toEqual(['hide', 'show']);
    wrapper.unmount();
    host.dispose();
  });

  it('does not toggle when the click target is a bullet', async () => {
    const { host, doMount } = setup({ config: { pagination: { hideOnClick: true } } }, 3);
    const wrapper = doMount();
    await flushPromises();
    const fired: string[] = [];
    host.on('paginationHide', () => fired.push('hide'));
    host.on('paginationShow', () => fired.push('show'));
    wrapper
      .find('.v-surfer-pagination-bullet')
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(fired).toEqual([]);
    expect(
      wrapper.find('.v-surfer-pagination').element.classList.contains('v-surfer-pagination-hidden'),
    ).toBe(false);
    wrapper.unmount();
    host.dispose();
  });

  it('does nothing when hideOnClick is off (default)', async () => {
    const { host, doMount } = setup({}, 3);
    const wrapper = doMount();
    await flushPromises();
    const fired: string[] = [];
    host.on('paginationHide', () => fired.push('hide'));
    wrapper
      .find('.v-surfer-wrapper')
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(fired).toEqual([]);
    wrapper.unmount();
    host.dispose();
  });
});
