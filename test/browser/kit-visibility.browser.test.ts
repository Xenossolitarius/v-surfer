import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
const kitMounts: MountedKit[] = [];
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-visibility');
});

afterAll(async () => {
  await g.save();
});

afterEach(() => {
  hosts.forEach((el) => el.remove());
  hosts.length = 0;
  kitMounts.forEach((m) => m.destroy());
  kitMounts.length = 0;
});

async function settle() {
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

function classedIndexes(root: HTMLElement, cls: string): number[] {
  return [...root.querySelectorAll('.v-surfer-slide')].flatMap((el, i) =>
    el.classList.contains(cls) ? [i] : [],
  );
}

describe('Surfer visibility parity (browser, real layout)', () => {
  for (const spv of [1, 2]) {
    it(`visible/fully-visible classes match the frozen Vue Surfer — slidesPerView ${spv}`, async () => {
      const kitMounted = mountKitSurfer(5, { slidesPerView: spv, spaceBetween: 0 }, 600, 300);
      kitMounts.push(kitMounted);

      await settle();

      const hRoot = kitMounted.el.querySelector('.v-surfer') as HTMLElement;
      expect(hRoot).toBeTruthy();

      expect(classedIndexes(hRoot, 'v-surfer-slide-visible')).toEqual(
        g.expected(`spv${spv}-visible-indexes`),
      );
      expect(classedIndexes(hRoot, 'v-surfer-slide-fully-visible')).toEqual(
        g.expected(`spv${spv}-fully-visible-indexes`),
      );
    });
  }
});
