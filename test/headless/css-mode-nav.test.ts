import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function makeEngine(extra: Record<string, unknown> = {}, count = 5) {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0, cssMode: true, ...extra });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

describe('cssMode navigation', () => {
  it('slideTo emits scrollSnapTarget WITHOUT committing activeIndex/translate (non-loop)', () => {
    const e = makeEngine();
    e.slideTo(2, { speed: 0 });
    expect(e.state.scrollSnapTarget).toEqual({ translate: -1600, speed: 0 });
    // Deferred: activeIndex/translate unchanged until scroll feedback.
    expect(e.state.activeIndex).toBe(0);
    expect(e.state.translate).toBe(0);
  });

  it('slideTo carries the speed and the next (non-target) commit clears scrollSnapTarget', () => {
    const e = makeEngine();
    e.slideTo(1, { speed: 300 });
    expect(e.state.scrollSnapTarget).toEqual({ translate: -800, speed: 300 });
    // The scroll feedback commit clears it.
    e.setTranslate(-800);
    expect(e.state.scrollSnapTarget).toBeNull();
  });

  it('setTranslate (scroll feedback) drives activeIndex/progress', () => {
    const e = makeEngine();
    e.setTranslate(-1600);
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.translate).toBe(-1600);
    expect(e.state.progress).toBeCloseTo(0.5, 5);
  });

  it('slideNext / slidePrev emit scroll targets (non-loop), driven by the fed-back position', () => {
    const e = makeEngine();
    e.setTranslate(-800); // land on index 1 via feedback
    e.slideNext({ speed: 0 });
    expect(e.state.scrollSnapTarget).toEqual({ translate: -1600, speed: 0 });
    e.setTranslate(-1600); // land on 2
    e.slidePrev({ speed: 0 });
    expect(e.state.scrollSnapTarget).toEqual({ translate: -800, speed: 0 });
  });

  it('pointer gestures are no-ops in cssMode', () => {
    const e = makeEngine();
    e.pointerStart({ x: 0, y: 0, time: 0 });
    e.pointerMove({ x: -100, y: 0, time: 16 });
    e.pointerEnd({ x: -100, y: 0, time: 32 });
    expect(e.state.translate).toBe(0);
    expect(e.state.touching).toBe(false);
    expect(e.state.scrollSnapTarget).toBeNull();
  });

  it('loop + cssMode emits a finite scroll target and tracks (invariant, not oracle-exact)', () => {
    const e = createEngine<number>(
      { slidesPerView: 1, spaceBetween: 0, cssMode: true, loop: true },
      { scheduler: (fn) => fn() },
    );
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: i })));
    e.slideNext({ speed: 0 });
    expect(e.state.scrollSnapTarget).not.toBeNull();
    expect(Number.isFinite(e.state.scrollSnapTarget!.translate)).toBe(true);
  });
});
