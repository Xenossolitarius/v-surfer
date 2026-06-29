import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import { goldenBrowser, type BrowserGolden } from '../golden/golden-browser';
import '../../src/vue/styles/core.css';

const hosts: HTMLElement[] = [];
let kitMounted: MountedKit | undefined;
let g: BrowserGolden;

beforeAll(async () => {
  g = await goldenBrowser('browser-loop');
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

describe('Surfer loop parity (browser, real layout)', () => {
  it('loop: realIndex + the visually-active real slide match the frozen Surfer after a wrap', async () => {
    kitMounted = mountKitSurfer(
      8,
      { loop: true, slidesPerView: 3, spaceBetween: 0, speed: 0 },
      600,
      160,
      200,
    );

    await settle();
    const { host } = kitMounted;

    for (let i = 0; i < 10; i += 1) {
      host.engine.slideNext({ speed: 0 });
      await settle();
      expect(host.state.value.realIndex).toBe(g.expected(`loop-realIndex-step-${i}`));
      expect(host.state.value.activeIndex).toBe(g.expected(`loop-activeIndex-step-${i}`));
      expect(Math.round(host.state.value.translate)).toBe(g.expected(`loop-translate-step-${i}`));
    }
    const active = host.state.value.slides[host.state.value.activeIndex];
    expect(active.realIndex).toBe(host.state.value.realIndex);
  });

  it('animates the loop wrap: a reposition baseline (dur 0) is painted, then it transitions to the final (dur speed)', async () => {
    kitMounted = mountKitSurfer(
      8,
      { loop: true, slidesPerView: 1, spaceBetween: 0, speed: 300 },
      600,
      160,
      200,
    );
    await settle();

    const { host } = kitMounted;
    const wrapper = host.wrapperEl.value as HTMLElement;

    host.engine.slidePrev();
    await nextTick();
    const baselineTransform = wrapper.style.transform;
    const baselineDuration = wrapper.style.transitionDuration;

    await settle();
    await nextTick();
    const settledTransform = wrapper.style.transform;
    const settledDuration = wrapper.style.transitionDuration;

    expect(baselineTransform).not.toBe(settledTransform);
    expect(baselineDuration).toBe('0ms');
    expect(settledDuration).toBe('300ms');
    expect(host.state.value.realIndex).toBe(7);
  });

  it('drag-loop: a finger drag past the edge wraps realIndex to match frozen', async () => {
    kitMounted = mountKitSurfer(
      8,
      { loop: true, slidesPerView: 1, spaceBetween: 0, speed: 0 },
      600,
      160,
      200,
    );
    await settle();

    const { host, el } = kitMounted;
    const container = el.querySelector('.v-surfer') as HTMLElement;

    const fire = (type: string, x: number, target: EventTarget) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          clientX: x,
          clientY: 100,
          bubbles: true,
          cancelable: true,
        }),
      );

    fire('pointerdown', 150, container);
    fire('pointermove', 165, document);
    fire('pointermove', 400, document);
    fire('pointermove', 650, document);
    fire('pointerup', 650, document);
    await settle();

    expect(host.state.value.realIndex).toBe(7);
    const active = host.state.value.slides[host.state.value.activeIndex];
    expect(active.realIndex).toBe(host.state.value.realIndex);
  });
});
