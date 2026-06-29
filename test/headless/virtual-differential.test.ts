import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

function makeEngine(count: number, params: Record<string, unknown>) {
  const e = createEngine<number>({ ...params, virtual: true });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

const g = golden('virtual');
afterAll(() => g.save());

describe('differential: virtual window vs frozen module (non-loop)', () => {
  for (const c of [
    { count: 10, params: { slidesPerView: 1, spaceBetween: 0 }, visit: [0, 1, 3, 5, 9] },
    {
      count: 10,
      params: { slidesPerView: 2, spaceBetween: 0, slidesPerGroup: 2 },
      visit: [0, 2, 4, 8],
    },
    {
      count: 10,
      params: { slidesPerView: 1, spaceBetween: 0, centeredSlides: true },
      visit: [0, 2, 5, 9],
    },
  ]) {
    it(`from/to/offset match — ${JSON.stringify(c.params)}`, () => {
      const engine = makeEngine(c.count, c.params);
      for (const [step, i] of c.visit.entries()) {
        engine.slideTo(i, { speed: 0 });
        const v = engine.state.virtual!;
        expect(v).not.toBeNull();
        const key = `win-${JSON.stringify(c.params)}-step${step}`;
        expect({ from: v.from, to: v.to, offset: v.offset }).toEqual(g.expected(key));
      }
    });
  }

  it('state.virtual is null when virtual is disabled', () => {
    const e = createEngine<number>({ slidesPerView: 1 });
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    expect(e.state.virtual).toBeNull();
  });
});

describe('virtual window under loop — invariants (not oracle-compared)', () => {
  it('window always covers the active index across a wrap', () => {
    const e = createEngine<number>(
      { slidesPerView: 1, spaceBetween: 0, loop: true, virtual: true },
      { scheduler: (fn) => fn() },
    );
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: i })));
    for (let step = 0; step < 8; step += 1) {
      e.slideNext({ speed: 0 });
      const v = e.state.virtual!;
      const active = e.state.activeIndex;
      // The window brackets the active position (from may be negative under loop).
      expect(v.from).toBeLessThanOrEqual(active);
      expect(v.to).toBeGreaterThanOrEqual(active);
      // The active slide is inside the clamped, renderable range.
      const lo = Math.max(0, v.from);
      const hi = Math.min(e.state.slides.length - 1, v.to);
      expect(active).toBeGreaterThanOrEqual(lo);
      expect(active).toBeLessThanOrEqual(hi);
      // The clamped window must contain no duplicate realIndexes — loopOrder is a permutation.
      const windowSlides = e.state.slides.slice(lo, hi + 1);
      const realIndexes = windowSlides.map((s) => s.realIndex);
      const uniqueRealIndexes = new Set(realIndexes);
      expect(uniqueRealIndexes.size).toBe(realIndexes.length);
      // The active slide's realIndex must be present in the rendered window.
      const activeRealIndex = e.state.slides[active].realIndex;
      expect(uniqueRealIndexes.has(activeRealIndex)).toBe(true);
    }
  });
});
