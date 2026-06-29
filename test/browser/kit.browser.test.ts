import { describe, it, expect, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mountKitSurfer, type MountedKit } from '../../test/setup/browser-harness';

let mounted: MountedKit | undefined;

afterEach(() => {
  mounted?.destroy();
  mounted = undefined;
});

describe('Surfer (browser, real layout)', () => {
  it('measures the real container and sizes slides to it', async () => {
    mounted = mountKitSurfer(5, { slidesPerView: 1 }, 600, 300, 200);
    await nextTick();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const first = mounted.el.querySelector('.v-surfer-slide') as HTMLElement;
    expect(first.getBoundingClientRect().width).toBeGreaterThan(0);
    // slidesPerView 1 → slide width == container width (600)
    expect(Math.round(first.getBoundingClientRect().width)).toBe(600);
  });

  it('advances and applies a real transform', async () => {
    mounted = mountKitSurfer(5, { slidesPerView: 1 }, 600, 300, 200);
    await nextTick();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const { host } = mounted;
    host.engine.slideNext({ speed: 0 });
    await nextTick();
    expect(host.state.value.activeIndex).toBe(1);
    expect(host.state.value.translate).toBeLessThan(0);
  });
});
