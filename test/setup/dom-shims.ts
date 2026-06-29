import { beforeAll } from 'vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;

  if (!('ResizeObserver' in g)) {
    g.ResizeObserver = ResizeObserverStub;
  }

  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(
        () => cb(performance.now()),
        0,
      ) as unknown as number) as typeof window.requestAnimationFrame;
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = ((id: number) =>
      clearTimeout(id)) as typeof window.cancelAnimationFrame;
  }

  // jsdom reports 0 for all layout boxes; give Surfer non-zero sizes so its
  // layout math (slidesPerView, snap grid) does not divide by zero.
  const sized = (value: number) => ({ configurable: true, get: () => value });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', sized(800));
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', sized(400));
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', sized(800));
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', sized(400));
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
});
