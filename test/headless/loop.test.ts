import { describe, it, expect } from 'vitest';
import { loopedSlidesCount, computeLoopFix, slideToLoopTarget } from '../../src/headless/loop';
import { normalizeParams } from '../../src/headless/params';

describe('loopedSlidesCount (non-centered)', () => {
  it('numeric slidesPerView: equals slidesPerGroup plus loopAdditionalSlides', () => {
    expect(loopedSlidesCount(normalizeParams({ slidesPerGroup: 1 }), 1)).toBe(1);
    expect(loopedSlidesCount(normalizeParams({ slidesPerGroup: 2 }), 1)).toBe(2);
    expect(loopedSlidesCount(normalizeParams({ slidesPerGroup: 3 }), 1)).toBe(3);
    // numeric slidesPerView does NOT affect it (frozen parity)
    expect(loopedSlidesCount(normalizeParams({ slidesPerView: 3, slidesPerGroup: 1 }), 3)).toBe(1);
    expect(
      loopedSlidesCount(normalizeParams({ slidesPerGroup: 2, loopAdditionalSlides: 2 }), 1),
    ).toBe(4);
  });

  it("'auto': base is max(slidesPerGroup, ceil(visible)) plus loopAdditionalSlides", () => {
    const auto = (over: Record<string, unknown>, spv: number) =>
      loopedSlidesCount(normalizeParams({ slidesPerView: 'auto', ...over }), spv);
    // buffer covers the visible count when it exceeds slidesPerGroup
    expect(auto({ slidesPerGroup: 1 }, 3)).toBe(3);
    expect(auto({ slidesPerGroup: 1 }, 1)).toBe(1);
    // slidesPerGroup dominates when larger; result stays a multiple of slidesPerGroup
    expect(auto({ slidesPerGroup: 2 }, 3)).toBe(4);
    // loopAdditionalSlides still adds on top
    expect(auto({ slidesPerGroup: 1, loopAdditionalSlides: 2 }, 3)).toBe(5);
  });
});

describe('computeLoopFix (nav path: slideNext/slidePrev)', () => {
  const grid = [0, 800, 1600, 2400, 3200, 4000, 4800, 5600]; // 8 uniform slides @800
  const id = [0, 1, 2, 3, 4, 5, 6, 7];
  const p = (over = {}) =>
    normalizeParams({ slidesPerView: 1, slidesPerGroup: 1, loop: true, ...over });

  it('returns null in the safe middle (no rotation needed)', () => {
    expect(
      computeLoopFix({
        order: id,
        activeIndex: 3,
        slidesGrid: grid,
        slidesPerView: 1,
        params: p(),
        direction: 'next',
      }),
    ).toBeNull();
  });

  it('appends a batch when slideNext is at the end', () => {
    const r = computeLoopFix({
      order: id,
      activeIndex: 7,
      slidesGrid: grid,
      slidesPerView: 1,
      params: p(),
      direction: 'next',
    });
    expect(r).toEqual({
      order: [1, 2, 3, 4, 5, 6, 7, 0],
      repositionIndex: 6,
      translateDelta: -800,
    });
  });

  it('prepends a batch when slidePrev is at the start', () => {
    const r = computeLoopFix({
      order: id,
      activeIndex: 0,
      slidesGrid: grid,
      slidesPerView: 1,
      params: p(),
      direction: 'prev',
    });
    expect(r).toEqual({ order: [7, 0, 1, 2, 3, 4, 5, 6], repositionIndex: 1, translateDelta: 800 });
  });

  it('rotates a slidesPerGroup=2 batch on prepend', () => {
    const r = computeLoopFix({
      order: id,
      activeIndex: 0,
      slidesGrid: grid,
      slidesPerView: 1,
      params: p({ slidesPerGroup: 2 }),
      direction: 'prev',
    });
    expect(r).toEqual({
      order: [6, 7, 0, 1, 2, 3, 4, 5],
      repositionIndex: 2,
      translateDelta: 1600,
    });
  });

  it('does nothing on init (next at index 0 builds prepend indexes but applies neither)', () => {
    expect(
      computeLoopFix({
        order: id,
        activeIndex: 0,
        slidesGrid: grid,
        slidesPerView: 1,
        params: p(),
        direction: 'next',
      }),
    ).toBeNull();
  });
});

describe('slideToLoopTarget', () => {
  const id = [0, 1, 2, 3, 4, 5, 6, 7];
  const p = (over = {}) =>
    normalizeParams({ slidesPerView: 3, slidesPerGroup: 1, loop: true, ...over });

  it('flags a near-end target as needing a next-fix', () => {
    // active 3, target real 6 at position 6: cols-6=2 < spv 3 → fix; 6-3-1=2 < 3 → 'next'
    const t = slideToLoopTarget(6, { order: id, activeIndex: 3, slidesPerView: 3, params: p() });
    expect(t).toEqual({ targetPosition: 6, needFix: true, direction: 'next', activeSlideIndex: 7 });
  });

  it('does not need a fix for a mid-track target', () => {
    const t = slideToLoopTarget(3, { order: id, activeIndex: 0, slidesPerView: 3, params: p() });
    expect(t.needFix).toBe(false);
  });
});

describe('computeLoopFix (translateDelta: drag origin shift)', () => {
  it('computeLoopFix exposes translateDelta = grid diff for the prepend (prev) branch', () => {
    // spv1 spg1 N8, container 800 ⇒ each slide 800px, slidesGrid = [0,800,1600,...].
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    const slidesGrid = [0, 800, 1600, 2400, 3200, 4000, 4800, 5600];
    const params = normalizeParams({ slidesPerView: 1, spaceBetween: 0, loop: true });
    const fix = computeLoopFix({
      order,
      activeIndex: 0,
      slidesGrid,
      slidesPerView: 1,
      params,
      direction: 'prev',
    });
    expect(fix).not.toBeNull();
    // prepend from index 0: slidesPrepended = max(loopedSlides(1) - 0, spg(1)) = 1
    // translateDelta = slidesGrid[0 + 1] - slidesGrid[0] = 800
    expect(fix!.translateDelta).toBe(800);
  });

  it('computeLoopFix exposes translateDelta = negative grid diff for the append (next) branch', () => {
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    const slidesGrid = [0, 800, 1600, 2400, 3200, 4000, 4800, 5600];
    const params = normalizeParams({ slidesPerView: 1, spaceBetween: 0, loop: true });
    // next edge-cross uses activeSlideIndex = N - ceil(spv) = 7
    const fix = computeLoopFix({
      order,
      activeIndex: 7,
      slidesGrid,
      slidesPerView: 1,
      params,
      direction: 'next',
      activeSlideIndex: 7,
    });
    expect(fix).not.toBeNull();
    // append: slidesAppended = max(7 - (8 - 1*2), spg(1)) = max(1,1) = 1
    // translateDelta = slidesGrid[7 - 1] - slidesGrid[7] = 4800 - 5600 = -800
    expect(fix!.translateDelta).toBe(-800);
  });
});

describe('computeLoopFix (slideToLoop override path)', () => {
  const grid = [0, 266.6667, 533.3333, 800, 1066.6667, 1333.3333, 1600, 1866.6667];
  const id = [0, 1, 2, 3, 4, 5, 6, 7];
  const p = (over = {}) =>
    normalizeParams({ slidesPerView: 3, slidesPerGroup: 1, loop: true, ...over });

  it('uses the override activeSlideIndex for the batch and the real activeIndex for the shift reposition', () => {
    // slideToLoop(6) from real active 3: activeSlideIndex override 7, slideRealIndex 3 (defined)
    const r = computeLoopFix({
      order: id,
      activeIndex: 3,
      slidesGrid: grid,
      slidesPerView: 3,
      params: p(),
      direction: 'next',
      activeSlideIndex: 7,
      slideRealIndex: 3,
    });
    expect(r).toEqual({ order: [1, 2, 3, 4, 5, 6, 7, 0], repositionIndex: 2, translateDelta: 0 });
  });
});
