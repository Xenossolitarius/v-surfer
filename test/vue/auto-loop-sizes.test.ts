import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

const realWidth = (n: number): number => 120 + (n % 4) * 60; // 120,180,240,300,...
const N = 8;
const flushRaf = (): Promise<unknown> => new Promise((r) => setTimeout(r, 0));

// Controllable ResizeObserver so the test can fire a re-measure after a rotation.
let roCallbacks: ResizeObserverCallback[] = [];
class TestRO {
  constructor(cb: ResizeObserverCallback) {
    roCallbacks.push(cb);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
const fireResize = (): void => roCallbacks.forEach((cb) => cb([], {} as ResizeObserver));

let app: App | undefined;
let hostEl: HTMLElement | undefined;
let savedRO: typeof globalThis.ResizeObserver;

beforeEach(() => {
  roCallbacks = [];
  savedRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = TestRO as unknown as typeof globalThis.ResizeObserver;
});
afterEach(() => {
  app?.unmount();
  hostEl?.remove();
  app = undefined;
  hostEl = undefined;
  globalThis.ResizeObserver = savedRO;
});

// Give each rendered slide a width keyed to its content (item-N), so the width
// follows the real slide through loop reordering regardless of DOM position.
function overrideSlideWidths(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.v-surfer-slide').forEach((s) => {
    const m = /item-(\d+)/.exec(s.textContent ?? '');
    if (!m) return;
    const n = Number(m[1]);
    Object.defineProperty(s, 'offsetWidth', { configurable: true, get: () => realWidth(n) });
  });
}

describe('vue auto + loop sizes', () => {
  it('feeds setGeometry sizes keyed by real index (stable across rotation)', async () => {
    let host!: ModuleHost;
    let lastSizes: number[] | undefined;
    hostEl = document.createElement('div');
    document.body.appendChild(hostEl);
    const items = Array.from({ length: N }, (_, i) => ({ n: i }));
    app = createApp({
      render: () =>
        h(
          Surfer,
          {
            slidesPerView: 'auto',
            loop: true,
            spaceBetween: 0,
            onReady: (hst: ModuleHost) => {
              host = hst;
              const orig = host.engine.setGeometry.bind(host.engine);
              host.engine.setGeometry = (g) => {
                if (g.sizes) lastSizes = g.sizes.slice();
                orig(g);
              };
            },
          },
          () =>
            items.map((it) => h(Item, { key: it.n, data: it }, () => h('span', `item-${it.n}`))),
        ),
    });
    app.mount(hostEl);
    await nextTick();
    await flushRaf();

    overrideSlideWidths(hostEl);
    // Rotate the loop order via programmatic navigation.
    let guard = 0;
    while (host.engine.state.slides[0]?.realIndex === 0 && guard < 3 * N) {
      host.engine.slideNext({ speed: 0 });
      await flushRaf();
      guard += 1;
    }
    expect(host.engine.state.slides[0].realIndex).not.toBe(0); // a rotation actually happened
    overrideSlideWidths(hostEl); // re-apply to reused/moved nodes

    // Re-measure AFTER the rotation. Real-index keying yields the SAME stable array
    // regardless of layout order; a positional feed would be the rotated order.
    fireResize();
    await nextTick();

    const expected = Array.from({ length: N }, (_, r) => realWidth(r));
    expect(lastSizes).toEqual(expected);
  });
});
