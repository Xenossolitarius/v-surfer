import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
let kitMounted: MountedKit | undefined;
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-slides-per-group-auto');
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

const widths = [120, 200, 160, 240, 180, 140, 220, 200];

async function settle() {
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

const za = (a: number[]) => a.map((n) => (n === 0 ? 0 : n));

describe('Surfer slidesPerGroupAuto parity (browser, real layout)', () => {
  it('paged Next/Prev land on the same activeIndex as the frozen Vue Surfer', async () => {
    kitMounted = mountKitSurfer(
      8,
      { slidesPerView: 'auto', slidesPerGroupAuto: true, spaceBetween: 0 },
      600,
      300,
      (i) => widths[i],
    );

    await settle();

    const { host } = kitMounted;

    expect(za(host.state.value.slidesGrid)).toEqual(g.expected('slidesGrid'));

    const steps: ('next' | 'prev')[] = ['next', 'next', 'next', 'prev', 'prev', 'next', 'prev'];
    for (let i = 0; i < steps.length; i += 1) {
      if (steps[i] === 'next') {
        host.engine.slideNext({ speed: 0 });
      } else {
        host.engine.slidePrev({ speed: 0 });
      }
      await settle();
      expect(host.state.value.activeIndex).toBe(g.expected(`activeIndex-step-${i}`));
    }
  });
});
