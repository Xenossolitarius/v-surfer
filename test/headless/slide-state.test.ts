import { describe, it, expect } from 'vitest';
import { computeSlideFlags } from '../../src/headless/slide-state';

describe('computeSlideFlags — active / prev / next', () => {
  const base = { offset: 0, size: 800, translate: 0, containerSize: 800 };

  it('marks the active slide and its immediate neighbors', () => {
    expect(computeSlideFlags({ ...base, index: 3, activeIndex: 3 }).isActive).toBe(true);
    expect(computeSlideFlags({ ...base, index: 4, activeIndex: 3 }).isNext).toBe(true);
    expect(computeSlideFlags({ ...base, index: 2, activeIndex: 3 }).isPrev).toBe(true);
    const far = computeSlideFlags({ ...base, index: 0, activeIndex: 3 });
    expect(far.isActive || far.isPrev || far.isNext).toBe(false);
  });

  it('has no prev at index 0 and no next at the active end', () => {
    expect(computeSlideFlags({ ...base, index: 0, activeIndex: 0 }).isPrev).toBe(false);
    expect(computeSlideFlags({ ...base, index: 4, activeIndex: 4 }).isNext).toBe(false);
  });
});

describe('computeSlideFlags — visibility (800px container)', () => {
  it('full-width slide at rest: only the active slide is visible', () => {
    const s0 = computeSlideFlags({
      index: 0,
      offset: 0,
      size: 800,
      translate: 0,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(s0.isVisible).toBe(true);
    expect(s0.isFullyVisible).toBe(true);

    const s1 = computeSlideFlags({
      index: 1,
      offset: 800,
      size: 800,
      translate: 0,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(s1.isVisible).toBe(false);
    expect(s1.isFullyVisible).toBe(false);
  });

  it('two-per-view mid-drag: edge slides are visible but not fully', () => {
    // slidesPerView 2 → size 400, grid [0,400,800,1200]; dragged 200px left
    const t = -200;
    const left = computeSlideFlags({
      index: 0,
      offset: 0,
      size: 400,
      translate: t,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(left.isVisible).toBe(true);
    expect(left.isFullyVisible).toBe(false); // straddles the left edge

    const mid = computeSlideFlags({
      index: 1,
      offset: 400,
      size: 400,
      translate: t,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(mid.isVisible).toBe(true);
    expect(mid.isFullyVisible).toBe(true);

    const right = computeSlideFlags({
      index: 2,
      offset: 800,
      size: 400,
      translate: t,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(right.isVisible).toBe(true);
    expect(right.isFullyVisible).toBe(false); // straddles the right edge

    const off = computeSlideFlags({
      index: 3,
      offset: 1200,
      size: 400,
      translate: t,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(off.isVisible).toBe(false);
  });

  it('a slide wider than the container is visible while it spans the viewport', () => {
    // 1200px slide in an 800px container, scrolled 100px: the left edge is off
    // to the left and the right edge off to the right, so only the third
    // isVisible branch (slideBefore <= 0 && slideAfter >= containerSize) fires.
    const flags = computeSlideFlags({
      index: 0,
      offset: 0,
      size: 1200,
      translate: -100,
      containerSize: 800,
      activeIndex: 0,
    });
    expect(flags.isVisible).toBe(true);
    expect(flags.isFullyVisible).toBe(false);
  });

  it('reports no visibility before measurement (containerSize 0)', () => {
    const flags = computeSlideFlags({
      index: 0,
      offset: 0,
      size: 200,
      translate: 0,
      containerSize: 0,
      activeIndex: 0,
    });
    expect(flags.isVisible).toBe(false);
    expect(flags.isFullyVisible).toBe(false);
    // active/prev/next are geometry-independent and still computed
    expect(flags.isActive).toBe(true);
  });
});
