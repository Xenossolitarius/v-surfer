import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
let kitMounted: MountedKit | undefined;
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-auto');
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

const widths = [120, 200, 160, 240, 180];

async function settle() {
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

// normalize -0 → 0 (frozen grids can carry -0 at the start)
const za = (a: number[]) => a.map((n) => (n === 0 ? 0 : n));

function classedIndexes(root: HTMLElement, cls: string): number[] {
  return [...root.querySelectorAll('.v-surfer-slide')].flatMap((el, i) =>
    el.classList.contains(cls) ? [i] : [],
  );
}

describe('Surfer slidesPerView auto parity (browser, real layout)', () => {
  it('auto grids, activeIndex and visible classes match the frozen Vue Surfer', async () => {
    kitMounted = mountKitSurfer(
      5,
      { slidesPerView: 'auto', spaceBetween: 0 },
      600,
      300,
      (i) => widths[i],
    );

    await settle();

    const { host } = kitMounted;

    // grids built from real measured widths must match the frozen oracle
    expect(za(host.state.value.slidesSizesGrid)).toEqual(g.expected('slidesSizesGrid'));
    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('snapGrid'));

    // navigation lands on the same index
    host.engine.slideTo(2, { speed: 0 });
    await settle();
    expect(host.state.value.activeIndex).toBe(g.expected('activeIndex-after-slideTo-2'));

    // visible / fully-visible class sets match under real layout
    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    expect(hRoot).toBeTruthy();
    expect(classedIndexes(hRoot, 'v-surfer-slide-visible')).toEqual(g.expected('visible-indexes'));
    expect(classedIndexes(hRoot, 'v-surfer-slide-fully-visible')).toEqual(
      g.expected('fully-visible-indexes'),
    );
  });
});
