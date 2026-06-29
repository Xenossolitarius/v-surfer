import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

// Reproduces the "drag leaves a blank viewport with virtual on" bug. During a drag the
// stored activeIndex stays put (it only advances on release), but the virtual render window
// is keyed to it — so as the wrapper is dragged the rendered slides scroll off-screen and
// nothing is left under the viewport. The window must follow the live translate (as frozen's
// virtual.update() does via updateActiveIndex on every setTranslate).

// The rendered window is the clamped slice [lo..hi] of the order; each rendered slide sits at
// its true grid coordinate (offset = slidesGrid[lo]), so on-screen left = slidesGrid[p]+translate.
function viewportIsCovered(engine: ReturnType<typeof makeEngine>): boolean {
  const s = engine.state;
  const v = s.virtual!;
  const lo = Math.max(0, v.from);
  const hi = Math.min(s.slides.length - 1, v.to);
  for (let p = lo; p <= hi; p += 1) {
    const left = s.slidesGrid[p] + s.translate;
    const right = left + s.slidesSizesGrid[p];
    if (left <= 0.5 && right >= 0.5) return true; // a rendered slide spans the viewport's left edge
  }
  return false;
}

function makeEngine(loop: boolean) {
  const e = createEngine<number>(
    { slidesPerView: 1, spaceBetween: 0, virtual: true, loop },
    { scheduler: (fn) => fn() },
  );
  e.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
  e.setGeometry({ containerSize: 408, sizes: Array.from({ length: 8 }, () => 408) });
  return e;
}

describe('virtual + drag: window follows the live translate', () => {
  for (const loop of [false, true]) {
    it(`keeps a slide under the viewport across a multi-slide drag (loop=${loop})`, () => {
      const e = makeEngine(loop);
      e.pointerStart({ x: 400, y: 50, time: 0 });
      let x = 400;
      let t = 0;
      for (let k = 0; k < 25; k += 1) {
        x -= 40; // ~1000px left total (≈2.5 slides at 408px)
        t += 16;
        e.pointerMove({ x, y: 50, time: t });
        expect(viewportIsCovered(e), `blank viewport mid-drag at step ${k} (loop=${loop})`).toBe(
          true,
        );
      }
      e.pointerEnd({ x, y: 50, time: t + 16 });
      expect(viewportIsCovered(e), `blank viewport after release (loop=${loop})`).toBe(true);
    });
  }
});
