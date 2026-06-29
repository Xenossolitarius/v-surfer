import { describe, it, expect } from 'vitest';
import { resolveBreakpoint, mergeBreakpointParams } from '../../src/headless/breakpoints';
import { createEngine } from '../../src/headless/engine';

describe('resolveBreakpoint', () => {
  const bps = { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } as Record<
    string,
    { slidesPerView: number }
  >;

  it('returns undefined when there are no breakpoints', () => {
    expect(resolveBreakpoint(undefined, { width: 800 })).toBeUndefined();
    expect(resolveBreakpoint({}, { width: 800 })).toBeUndefined();
  });

  it("falls back to 'max' when the width is below every key", () => {
    expect(resolveBreakpoint(bps, { width: 500 })).toBe('max');
  });

  it('picks the largest key whose value is <= width', () => {
    expect(resolveBreakpoint(bps, { width: 640 })).toBe('640'); // boundary: equal matches
    expect(resolveBreakpoint(bps, { width: 700 })).toBe('640');
    expect(resolveBreakpoint(bps, { width: 1023 })).toBe('640');
    expect(resolveBreakpoint(bps, { width: 1024 })).toBe('1024');
    expect(resolveBreakpoint(bps, { width: 2000 })).toBe('1024');
  });

  it('resolves @ratio keys against height', () => {
    const r = { '@0.5': { slidesPerView: 2 }, '@1.0': { slidesPerView: 3 } } as Record<
      string,
      { slidesPerView: number }
    >;
    // height 1000 → @0.5 = 500, @1.0 = 1000
    expect(resolveBreakpoint(r, { width: 600, height: 1000 })).toBe('@0.5');
    expect(resolveBreakpoint(r, { width: 1000, height: 1000 })).toBe('@1.0');
    expect(resolveBreakpoint(r, { width: 400, height: 1000 })).toBe('max');
  });

  it('skips @ratio keys when no height is supplied; numeric keys still resolve', () => {
    const mixed = { 640: { slidesPerView: 2 }, '@0.5': { slidesPerView: 9 } } as Record<
      string,
      { slidesPerView: number }
    >;
    expect(resolveBreakpoint(mixed, { width: 700 })).toBe('640'); // @0.5 ignored
  });
});

describe('mergeBreakpointParams', () => {
  it('returns a copy of base when bp is undefined', () => {
    const base = { slidesPerView: 1, spaceBetween: 10 };
    expect(mergeBreakpointParams(base, undefined)).toEqual(base);
  });

  it('overrides base layout params with the breakpoint params', () => {
    const base = { slidesPerView: 1, spaceBetween: 10 };
    expect(mergeBreakpointParams(base, { slidesPerView: 3, spaceBetween: 30 })).toEqual({
      slidesPerView: 3,
      spaceBetween: 30,
    });
  });

  it('ignores loop/direction carried by a breakpoint, keeping the base value', () => {
    const base = { slidesPerView: 1, loop: true, direction: 'horizontal' as const };
    const merged = mergeBreakpointParams(base, {
      slidesPerView: 2,
      // @ts-expect-error — loop is not part of BreakpointParams, but a JS consumer could pass it
      loop: false,
      // @ts-expect-error — direction likewise excluded
      direction: 'vertical',
    });
    expect(merged.slidesPerView).toBe(2);
    expect(merged.loop).toBe(true); // base retained
    expect(merged.direction).toBe('horizontal'); // base retained
  });
});

/** 800px container, N slides; first slide size reveals the effective slidesPerView/spaceBetween. */
function engine(count: number, params: Record<string, unknown>) {
  const e = createEngine<number>(params);
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

describe('engine breakpoint application', () => {
  const breakpoints = { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3, spaceBetween: 30 } };

  it('applies no override below the smallest key (max → base params)', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10, breakpoints });
    e.setBreakpointDimensions({ width: 500 });
    expect(e.state.slidesSizesGrid[0]).toBe(800); // base slidesPerView 1
  });

  it('applies the matching breakpoint (640 → slidesPerView 2)', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10, breakpoints });
    e.setBreakpointDimensions({ width: 700 });
    // slidesPerView 2, spaceBetween 10 (not overridden by the 640 bp): (800 - 10) / 2 = 395
    expect(e.state.slidesSizesGrid[0]).toBe(395);
  });

  it('applies the larger breakpoint (1024 → slidesPerView 3, spaceBetween 30)', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10, breakpoints });
    e.setBreakpointDimensions({ width: 1200 });
    expect(e.state.slidesSizesGrid[0]).toBeCloseTo((800 - 60) / 3, 6);
  });

  it('does not accumulate overrides — crossing back restores the earlier params (no sticky)', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10, breakpoints });
    e.setBreakpointDimensions({ width: 1200 }); // 1024: spv3, spaceBetween 30
    e.setBreakpointDimensions({ width: 700 }); // 640: spv2, spaceBetween back to base 10
    expect(e.state.slidesSizesGrid[0]).toBe(395); // (800-10)/2, NOT (800-30)/2=385
  });

  it('preserves the active real index across a breakpoint change', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10, breakpoints });
    e.slideTo(2, { speed: 0 });
    e.setBreakpointDimensions({ width: 700 });
    expect(e.state.realIndex).toBe(2);
  });

  it('is inert when there are no breakpoints', () => {
    const e = engine(6, { slidesPerView: 1, spaceBetween: 10 });
    e.setBreakpointDimensions({ width: 1200 });
    expect(e.state.slidesSizesGrid[0]).toBe(800);
  });
});
