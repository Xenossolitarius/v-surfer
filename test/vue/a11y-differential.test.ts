import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import KitSurfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import KitA11y, { A11yModule } from '../../src/vue/modules/a11y';
import KitNavigation, { NavigationModule } from '../../src/vue/modules/navigation';
import KitPagination, { PaginationModule } from '../../src/vue/modules/pagination';
import type { ModuleHost } from '../../src/vue/module-host';
import { golden } from '../golden/golden';

// ---- Kit: the same chrome (nav + clickable bullet pagination) + a11y module, rendered by
// KitSurfer. The kit derives loop/rewind from host state, so those go to KitSurfer, NOT KitA11y. ----
function makeKit(
  count: number,
  params: Record<string, unknown>,
  a11yProps: Record<string, unknown>,
) {
  let host: ModuleHost | null = null;
  const wrapper = mount(KitSurfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      ...params,
      modules: [A11yModule, NavigationModule, PaginationModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(KitNavigation),
        h(KitPagination, { type: 'bullets', clickable: true }),
        h(KitA11y, a11yProps),
      ],
    },
  });
  const container = wrapper.element as HTMLElement;
  return {
    wrapper,
    container,
    surferWrapper: container.querySelector<HTMLElement>('.v-surfer-wrapper')!,
    prev: () => container.querySelector<HTMLElement>('.v-surfer-button-prev')!,
    next: () => container.querySelector<HTMLElement>('.v-surfer-button-next')!,
    pagEl: container,
    getHost: () => host!,
  };
}

const g = golden('a11y');
afterAll(() => g.save());

let kitWrapper: VueWrapper | undefined;
afterEach(() => {
  kitWrapper?.unmount();
  kitWrapper = undefined;
  document.body.innerHTML = '';
});

const slideLabels = (root: HTMLElement): (string | null)[] =>
  Array.from(root.querySelectorAll('.v-surfer-slide')).map((s) => s.getAttribute('aria-label'));

describe('differential: kit a11y vs frozen module (non-loop)', () => {
  it('slide labels, slide role, and wrapper aria-live match', async () => {
    const hd = makeKit(5, {}, {});
    kitWrapper = hd.wrapper;
    await flushPromises();
    expect(slideLabels(hd.surferWrapper)).toEqual(g.expected('non-loop-slide-labels'));
    expect(hd.surferWrapper.querySelectorAll('.v-surfer-slide')[0].getAttribute('role')).toBe(
      g.expected('non-loop-slide-role'),
    );
    expect(hd.surferWrapper.getAttribute('aria-live')).toBe(
      g.expected('non-loop-wrapper-aria-live'),
    );
  });

  it('autoplay flips wrapper aria-live to off on both', async () => {
    const hd = makeKit(3, {}, { autoplay: true });
    kitWrapper = hd.wrapper;
    await flushPromises();
    expect(hd.surferWrapper.getAttribute('aria-live')).toBe(g.expected('autoplay-aria-live'));
    expect(hd.surferWrapper.getAttribute('aria-live')).toBe('off');
  });

  it('container role/label/roledescription match when set', async () => {
    const opts = {
      containerRole: 'region',
      containerMessage: 'My carousel',
      containerRoleDescriptionMessage: 'carousel',
    };
    const hd = makeKit(4, {}, opts);
    kitWrapper = hd.wrapper;
    await flushPromises();
    for (const attr of ['role', 'aria-label', 'aria-roledescription']) {
      expect(hd.container.getAttribute(attr)).toBe(g.expected(`container-${attr}`));
    }
  });

  it('custom slideRole + itemRoleDescription match', async () => {
    const opts = { slideRole: 'listitem', itemRoleDescriptionMessage: 'slide' };
    const hd = makeKit(4, {}, opts);
    kitWrapper = hd.wrapper;
    await flushPromises();
    const hSlide = hd.surferWrapper.querySelectorAll('.v-surfer-slide')[1];
    expect(hSlide.getAttribute('role')).toBe(g.expected('custom-slide-role'));
    expect(hSlide.getAttribute('aria-roledescription')).toBe(
      g.expected('custom-slide-aria-roledescription'),
    );
  });

  it('navigation aria-disabled toggles identically across the range (no loop/rewind)', async () => {
    const hd = makeKit(5, {}, {});
    kitWrapper = hd.wrapper;
    await flushPromises();
    for (let i = 0; i < 5; i += 1) {
      hd.getHost().goTo(i, { speed: 0 });
      await flushPromises();
      expect(hd.prev().getAttribute('aria-disabled')).toBe(
        g.expected(`nav-disabled-no-loop-prev-step${i}`),
      );
      expect(hd.next().getAttribute('aria-disabled')).toBe(
        g.expected(`nav-disabled-no-loop-next-step${i}`),
      );
    }
  });

  it('rewind leaves nav enabled at the edges on both', async () => {
    const hd = makeKit(5, { rewind: true }, {});
    kitWrapper = hd.wrapper;
    await flushPromises();
    for (let i = 0; i < 5; i += 1) {
      hd.getHost().goTo(i, { speed: 0 });
      await flushPromises();
      expect(hd.prev().getAttribute('aria-disabled')).toBe(
        g.expected(`nav-disabled-rewind-prev-step${i}`),
      );
      expect(hd.next().getAttribute('aria-disabled')).toBe(
        g.expected(`nav-disabled-rewind-next-step${i}`),
      );
    }
  });

  it('pagination bullet labels, role, and aria-current match', async () => {
    const hd = makeKit(4, {}, {});
    kitWrapper = hd.wrapper;
    await flushPromises();
    const hBullets = Array.from(hd.pagEl.querySelectorAll('.v-surfer-pagination-bullet'));
    expect(hBullets.map((b) => b.getAttribute('aria-label'))).toEqual(
      g.expected('bullet-aria-labels'),
    );
    expect(hBullets[0].getAttribute('role')).toBe(g.expected('bullet-role'));
    expect(hBullets.map((b) => b.getAttribute('aria-current'))).toEqual(
      g.expected('bullet-aria-current-before'),
    );
    // Advance and re-assert aria-current is still oracle-matched at a non-zero index.
    hd.getHost().goTo(2, { speed: 0 });
    await flushPromises();
    const hAfter = Array.from(hd.pagEl.querySelectorAll('.v-surfer-pagination-bullet'));
    expect(hAfter.map((b) => b.getAttribute('aria-current'))).toEqual(
      g.expected('bullet-aria-current-after'),
    );
  });
});

describe('differential: kit a11y vs frozen module (loop — multiset)', () => {
  it('slide aria-labels match frozen as a multiset', async () => {
    const hd = makeKit(6, { loop: true }, {});
    kitWrapper = hd.wrapper;
    await flushPromises();
    const sort = (xs: (string | null)[]) => [...xs].sort();
    // Compare the multiset of unique real labels (loop duplicates/reorders differ positionally
    // between the frozen clone strategy and the kit window, but every real slide is represented).
    const hLabels = sort(Array.from(new Set(slideLabels(hd.surferWrapper))));
    expect(hLabels).toEqual(g.expected('loop-slide-labels-multiset'));
    // Every real slide 1..6 is represented.
    expect(hLabels).toEqual(sort(['1 / 6', '2 / 6', '3 / 6', '4 / 6', '5 / 6', '6 / 6']));
  });
});
