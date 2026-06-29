import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
let kitMounted: MountedKit | undefined;
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-centered');
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

function classedIndexes(root: HTMLElement, cls: string): number[] {
  return [...root.querySelectorAll('.v-surfer-slide')].flatMap((el, i) =>
    el.classList.contains(cls) ? [i] : [],
  );
}

describe('Surfer centeredSlides parity (browser, real layout)', () => {
  it('integer slidesPerView: grids, activeIndex and visibility match the frozen Surfer', async () => {
    kitMounted = mountKitSurfer(
      6,
      { slidesPerView: 3, centeredSlides: true, spaceBetween: 0 },
      900,
      300,
    );

    await settle();
    const { host } = kitMounted;

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('int-slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('int-snapGrid'));
    expect(host.state.value.activeIndex).toBe(g.expected('int-activeIndex-0'));

    for (const idx of [2, 4, 1]) {
      host.engine.slideTo(idx, { speed: 0 });
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`int-activeIndex-${idx}`));
    }

    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    expect(classedIndexes(hRoot, 'v-surfer-slide-visible')).toEqual(
      g.expected('int-visible-indexes'),
    );
    expect(classedIndexes(hRoot, 'v-surfer-slide-fully-visible')).toEqual(
      g.expected('int-fully-visible-indexes'),
    );
  });

  it("'auto' slidesPerView: grids, activeIndex and visibility match the frozen Surfer", async () => {
    kitMounted = mountKitSurfer(
      6,
      { slidesPerView: 'auto', centeredSlides: true, spaceBetween: 0 },
      600,
      300,
      (i) => [120, 200, 160, 240, 180, 140][i],
    );

    await settle();
    const { host } = kitMounted;

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('auto-slidesGrid'));
    expect(za(host.state.value.snapGrid)).toEqual(g.expected('auto-snapGrid'));
    expect(host.state.value.activeIndex).toBe(g.expected('auto-activeIndex-0'));

    for (const idx of [3, 1]) {
      host.engine.slideTo(idx, { speed: 0 });
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`auto-activeIndex-${idx}`));
    }

    const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
    expect(hRoot).toBeTruthy();
    expect(classedIndexes(hRoot, 'v-surfer-slide-visible')).toEqual(
      g.expected('auto-visible-indexes'),
    );
    expect(classedIndexes(hRoot, 'v-surfer-slide-fully-visible')).toEqual(
      g.expected('auto-fully-visible-indexes'),
    );
  });
});
