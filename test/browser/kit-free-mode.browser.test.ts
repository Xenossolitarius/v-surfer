import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';
import '../../src/vue/styles/core.css';

let kitMounted: MountedKit | undefined;

afterEach(() => {
  kitMounted?.destroy();
  kitMounted = undefined;
});

async function settle() {
  await nextTick();
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}

function mountFreeKit(width: number, count: number, extra: Record<string, unknown>): MountedKit {
  return mountKitSurfer(
    count,
    { slidesPerView: 1, spaceBetween: 0, threshold: 0, freeMode: true, ...extra },
    width,
    300,
  );
}

describe('Surfer freeMode (browser, real layout)', () => {
  it('momentum lands within the translate bounds', async () => {
    kitMounted = mountFreeKit(600, 6, {});
    await settle();
    const { host } = kitMounted;
    const min = 0;
    const max = -host.state.value.snapGrid[host.state.value.snapGrid.length - 1];
    host.engine.pointerStart({ x: 500, y: 100, time: 0 });
    host.engine.pointerMove({ x: 460, y: 100, time: 16 });
    host.engine.pointerEnd({ x: 460, y: 100, time: 20 });
    await settle();
    expect(host.state.value.translate).toBeLessThanOrEqual(min);
    expect(host.state.value.translate).toBeGreaterThanOrEqual(max);
  });

  it('sticky lands exactly on a snap point', async () => {
    kitMounted = mountFreeKit(600, 6, { freeModeSticky: true });
    await settle();
    const { host } = kitMounted;
    host.engine.pointerStart({ x: 500, y: 100, time: 0 });
    host.engine.pointerMove({ x: 460, y: 100, time: 16 });
    host.engine.pointerEnd({ x: 460, y: 100, time: 20 });
    await settle();
    const onSnap = host.state.value.snapGrid.some(
      (g) => Math.abs(-host.state.value.translate - g) < 1,
    );
    expect(onSnap).toBe(true);
  });

  it('bounce overshoots past the end, then settles to the boundary on transitionend', async () => {
    kitMounted = mountFreeKit(600, 3, { resistance: false });
    await settle();
    const { host, el } = kitMounted;
    const max = -host.state.value.snapGrid[host.state.value.snapGrid.length - 1];
    host.engine.slideTo(1, { speed: 0 });
    await settle();
    host.engine.pointerStart({ x: 500, y: 100, time: 0 });
    host.engine.pointerMove({ x: 470, y: 100, time: 10 });
    host.engine.pointerEnd({ x: 470, y: 100, time: 14 });
    await settle();
    expect(host.state.value.translate).toBeLessThan(max); // overshoot past the end

    const wrapper = el.querySelector('.v-surfer-wrapper') as HTMLElement;
    const ev = new Event('transitionend', { bubbles: true });
    Object.assign(ev, { propertyName: 'transform' });
    wrapper.dispatchEvent(ev);
    await settle();
    expect(host.state.value.translate).toBeCloseTo(max, 0); // settled to the boundary
  });
});
