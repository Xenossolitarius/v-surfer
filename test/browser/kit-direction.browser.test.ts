import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
let kitMounted: MountedKit | undefined;
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-direction');
});

afterAll(async () => {
  await g.save();
});

afterEach(() => {
  hosts.forEach((el) => el.remove());
  hosts.length = 0;
  kitMounted?.destroy();
  kitMounted = undefined;
});

async function settle() {
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

const za = (a: number[]) => a.map((n) => (n === 0 ? 0 : n));
const classedIndexes = (root: HTMLElement, cls: string) =>
  [...root.querySelectorAll('.v-surfer-slide')].flatMap((el, i) =>
    el.classList.contains(cls) ? [i] : [],
  );

describe('Surfer vertical parity (browser, real layout)', () => {
  it('vertical: grids, activeIndex and visibility match the frozen Surfer', async () => {
    kitMounted = mountKitSurfer(
      6,
      { direction: 'vertical', slidesPerView: 3, spaceBetween: 0 },
      300,
      360,
    );

    await settle();
    const { host } = kitMounted;

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('vert-slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('vert-snapGrid'));
    expect(host.state.value.activeIndex).toBe(g.expected('vert-activeIndex-0'));

    for (const idx of [2, 4, 1]) {
      host.engine.slideTo(idx, { speed: 0 });
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`vert-activeIndex-${idx}`));
    }

    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    expect(hRoot.classList.contains('v-surfer-vertical')).toBe(true);
    expect(classedIndexes(hRoot, 'v-surfer-slide-visible')).toEqual(
      g.expected('vert-visible-indexes'),
    );
  });

  it('vertical+rtl: rtl is cosmetic only — translate stays canonical, matching the frozen Surfer', async () => {
    kitMounted = mountKitSurfer(
      6,
      { direction: 'vertical', rtl: true, slidesPerView: 3, spaceBetween: 0 },
      300,
      360,
    );

    await settle();
    const { host } = kitMounted;

    // Frozen-instance preconditions (f.rtl, f.rtlTranslate) are internal to the
    // frozen oracle and have no kit analog — dropped per golden-conversion rules.

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('vertrtl-slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('vertrtl-snapGrid'));

    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    // The cosmetic rtl class is present (matches frozen) but vertical layout is preserved.
    expect(hRoot.classList.contains('v-surfer-rtl')).toBe(true);
    expect(hRoot.classList.contains('v-surfer-vertical')).toBe(true);

    for (const idx of [2, 4, 1]) {
      host.engine.slideTo(idx, { speed: 0 });
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`vertrtl-activeIndex-${idx}`));
      // translate stays canonical (≤ 0) and matches frozen — NOT mirrored positive.
      expect(Math.round(host.state.value.translate)).toBe(g.expected(`vertrtl-translate-${idx}`));
    }
  });

  it('rtl: grids, translate sign, activeIndex and the v-surfer-rtl class match the frozen Surfer', async () => {
    kitMounted = mountKitSurfer(6, { rtl: true, slidesPerView: 2, spaceBetween: 0 }, 600, 200);

    await settle();
    const { host } = kitMounted;

    // Frozen-instance precondition (f.rtlTranslate) is internal to the frozen
    // oracle and has no kit analog — dropped per golden-conversion rules.

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('rtl-slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('rtl-snapGrid'));

    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    expect(hRoot.classList.contains('v-surfer-rtl')).toBe(true);

    for (const idx of [2, 4, 1]) {
      host.engine.slideTo(idx, { speed: 0 });
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`rtl-activeIndex-${idx}`));
      // rtl exposes the same signed translate as the frozen core
      expect(Math.round(host.state.value.translate)).toBe(g.expected(`rtl-translate-${idx}`));
    }
  });
});
