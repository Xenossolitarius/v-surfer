import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { scrollbarModel } from '../../src/headless/scrollbar';

function engineAt(count: number, params: Record<string, unknown>, index: number) {
  const e = createEngine<number>(params);
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  e.slideTo(index, { speed: 0 });
  return e;
}

const NOTC = { centered: false, rtl: false };

describe('scrollbarModel', () => {
  it('thumb size = trackSize * (size / virtualSize) at the beginning', () => {
    // 5 slides of 800 → virtualSize 4000, size 800, divider 0.2 → dragSize 160, pos 0.
    const e = engineAt(5, { slidesPerView: 1, spaceBetween: 0 }, 0);
    const m = scrollbarModel(e.state, NOTC, 800);
    expect(m.hidden).toBe(false);
    expect(m.locked).toBe(false);
    expect(m.size).toBeCloseTo(160, 5);
    expect(m.position).toBeCloseTo(0, 5);
  });

  it('positions the thumb by progress', () => {
    // progress 1 at the end → newPos = (800 - 160) * 1 = 640, no shrink (fits exactly).
    const e = engineAt(5, { slidesPerView: 1, spaceBetween: 0 }, 4);
    const m = scrollbarModel(e.state, NOTC, 800);
    expect(m.position).toBeCloseTo(640, 5);
    expect(m.size).toBeCloseTo(160, 5);
  });

  it('hides when everything fits (divider >= 1)', () => {
    // 1 slide → virtualSize == size → divider 1 → hidden.
    const e = engineAt(1, { slidesPerView: 1, spaceBetween: 0 }, 0);
    const m = scrollbarModel(e.state, NOTC, 800);
    expect(m.hidden).toBe(true);
    expect(m.locked).toBe(true);
  });

  it('hides before measurement (size 0)', () => {
    const e = createEngine<number>({ slidesPerView: 1 });
    e.setSlides([{ data: 0 }, { data: 1 }]);
    const m = scrollbarModel(e.state, NOTC, 800);
    expect(m.hidden).toBe(true);
  });

  it('mirrors thumb position under RTL', () => {
    // Same geometry, rtl: progress 0 → newPos 0 → mirrored -0 → 0; verify a mid position mirrors.
    const e = engineAt(5, { slidesPerView: 1, spaceBetween: 0 }, 2); // progress 0.5
    const ltr = scrollbarModel(e.state, { centered: false, rtl: false }, 800);
    const rtl = scrollbarModel(e.state, { centered: false, rtl: true }, 800);
    // LTR mid pos = (800-160)*0.5 = 320; RTL mirrors to the same magnitude from the other side.
    expect(ltr.position).toBeCloseTo(320, 5);
    // rtl newPos = -(320) = -320 → not >0, not (-(-320)+160=480 >800? no) → stays -320.
    expect(rtl.position).toBeCloseTo(-320, 5);
  });
});
