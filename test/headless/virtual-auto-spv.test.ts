import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

// slidesPerView:'auto' has no numeric value for the virtual-window math, so the engine
// normally falls back to a 1-slide-ahead window. virtualAutoSlidesPerView lets a consumer
// supply the estimated visible count to use as the window's slidesPerView instead — and it
// needs no measurement, so it works before/without geometry (SSR + first paint included).
describe('virtualAutoSlidesPerView (auto + virtual window sizing)', () => {
  it('uses virtualAutoSlidesPerView as the window slidesPerView when slidesPerView is "auto"', () => {
    const e = createEngine<number>({
      slidesPerView: 'auto',
      virtual: true,
      virtualAutoSlidesPerView: 3,
    });
    e.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
    // No geometry; activeIndex 0. With spv 3 (spg 1, non-loop): slidesAfter = 3, slidesBefore = 1
    // → from max(0-1,0)=0, to min(0+3,7)=3 → a 4-slide window, exactly like numeric slidesPerView:3.
    expect(e.state.virtual).toEqual({ from: 0, to: 3, offset: 0 });
  });

  it('falls back to the 1-slide-ahead window when virtualAutoSlidesPerView is unset', () => {
    const e = createEngine<number>({ slidesPerView: 'auto', virtual: true });
    e.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
    expect(e.state.virtual).toEqual({ from: 0, to: 1, offset: 0 });
  });

  it('does not affect numeric slidesPerView (the real value still wins)', () => {
    const e = createEngine<number>({
      slidesPerView: 2,
      virtual: true,
      virtualAutoSlidesPerView: 5,
    });
    e.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
    // spv 2 (spg 1): slidesAfter = 2, slidesBefore = 1 → from 0, to 2 — unchanged by the estimate.
    expect(e.state.virtual).toEqual({ from: 0, to: 2, offset: 0 });
  });
});
