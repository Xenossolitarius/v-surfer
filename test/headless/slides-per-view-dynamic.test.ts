import { describe, it, expect } from 'vitest';
import {
  slidesPerViewDynamic,
  type SpvDynamicCtx,
} from '../../src/headless/slides-per-view-dynamic';

// Varied deck: sizes [120,200,160,240,180] in a 600px viewport.
// slidesGrid is the cumulative left edge of each slide (spaceBetween 0).
const ctx = (over: Partial<SpvDynamicCtx>): SpvDynamicCtx => ({
  slidesPerView: 'auto',
  centeredSlides: false,
  slidesGrid: [0, 120, 320, 480, 720],
  slidesSizesGrid: [120, 200, 160, 240, 180],
  containerSize: 600,
  activeIndex: 0,
  ...over,
});

describe('slidesPerViewDynamic', () => {
  it("counts slides whose right edge fits ('current', exact)", () => {
    // from slide 0: 120+200+160=480 <= 600, adding 240 -> 720 > 600 => 3
    expect(slidesPerViewDynamic('current', true, ctx({ activeIndex: 0 }))).toBe(3);
    // from slide 3: only slide 4 (180) fits within 600 => 2
    expect(slidesPerViewDynamic('current', true, ctx({ activeIndex: 3 }))).toBe(2);
  });

  it('counts more slides when not exact (partial slides count)', () => {
    // non-exact uses the left edge only, so slide 3's start (480 < 600) also counts => 4
    expect(slidesPerViewDynamic('current', false, ctx({ activeIndex: 0 }))).toBe(4);
  });

  it("counts backward from the active slide ('previous')", () => {
    // from slide 3 looking back: slides 2,1,0 are all within 600 of slide 3 => 4
    expect(slidesPerViewDynamic('previous', true, ctx({ activeIndex: 3 }))).toBe(4);
  });

  it('returns 1 at the last slide looking forward', () => {
    expect(slidesPerViewDynamic('current', true, ctx({ activeIndex: 4 }))).toBe(1);
  });

  it('short-circuits to a numeric slidesPerView', () => {
    expect(slidesPerViewDynamic('current', true, ctx({ slidesPerView: 3 }))).toBe(3);
  });

  it('counts symmetrically around the active slide when centered', () => {
    // 300px slides in a 900px viewport, centered.
    const centered = (activeIndex: number) =>
      slidesPerViewDynamic('current', true, {
        slidesPerView: 'auto',
        centeredSlides: true,
        slidesGrid: [-300, 0, 300, 600, 900],
        slidesSizesGrid: [300, 300, 300, 300, 300],
        containerSize: 900,
        activeIndex,
      });
    // active in the middle: active(300) +fwd ceil300→600, +fwd ceil300→900 (900>900 is
    // false, no break) +back 300→1200 (>900, break, slide 0 skipped) => spv 4
    expect(centered(2)).toBe(4);
    // active at index 0: forward-only path fires (no backward slides) => still 4
    expect(centered(0)).toBe(4);
    // active at the last index: backward-only path fires (forward loop body never runs) => 4
    expect(centered(4)).toBe(4);
  });
});
