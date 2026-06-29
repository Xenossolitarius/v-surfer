import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { scrollbarModel } from '../../src/headless/scrollbar';
import { golden } from '../golden/golden';

const TRACK = 800; // every element is 800px wide in happy-dom (dom-shims).

function makeEngine(
  count: number,
  params: Record<string, unknown>,
  deps?: { scheduler?: (fn: () => void) => void },
) {
  const e = createEngine<number>(params, deps);
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

const g = golden('scrollbar');
afterAll(() => g.save());

describe('differential: scrollbar display vs frozen module', () => {
  for (const c of [
    { count: 5, params: { slidesPerView: 1, spaceBetween: 0 } },
    { count: 6, params: { slidesPerView: 2, spaceBetween: 0, slidesPerGroup: 2 } },
  ]) {
    it(`thumb size + position match — ${JSON.stringify(c.params)}`, () => {
      const engine = makeEngine(c.count, c.params);
      for (const [step, i] of [0, 1, 2, 1].entries()) {
        engine.slideTo(i, { speed: 0 });
        const m = scrollbarModel(engine.state, { centered: false, rtl: false }, TRACK);
        const keyBase = `thumb-${JSON.stringify(c.params)}-step${step}`;
        expect(m.size).toBeCloseTo(g.expected(`${keyBase}-size`) as number, 3);
        expect(m.position).toBeCloseTo(g.expected(`${keyBase}-pos`) as number, 3);
      }
    });
  }

  it('loop: thumb tracks frozen progressLoop across a wrap (no teleport)', () => {
    const params = { slidesPerView: 1, spaceBetween: 0, loop: true };
    const engine = makeEngine(5, params, { scheduler: (fn) => fn() });
    // Step forward through the whole set, including the loop wrap (slide 4 → 0).
    for (let i = 0; i < 6; i += 1) {
      engine.slideNext({ speed: 0 });
      const m = scrollbarModel(engine.state, { centered: false, rtl: false, loop: true }, TRACK);
      // Frozen drives the loop scrollbar from progressLoop; positions must match.
      expect(m.position).toBeCloseTo(g.expected(`loop-step${i}-pos`) as number, 2);
      expect(m.size).toBeCloseTo(g.expected(`loop-step${i}-size`) as number, 2);
    }
  });

  it('hides + locks for a single-slide surfer', () => {
    const engine = makeEngine(1, { slidesPerView: 1, spaceBetween: 0 });
    const m = scrollbarModel(engine.state, { centered: false, rtl: false }, TRACK);
    expect(m.hidden).toBe(true);
    expect(m.locked).toBe(true);
  });
});

describe('differential: scrollbar drag write-path vs frozen core', () => {
  // Drive the engine's translate→activeIndex + threshold-snap logic:
  // setProgress / slideToClosest against fixture values.
  it('setProgress matches frozen translate + activeIndex across the range', () => {
    const params = { slidesPerView: 1, spaceBetween: 0 };
    const engine = makeEngine(5, params);
    for (const [step, ratio] of [0, 0.25, 0.5, 0.75, 1].entries()) {
      engine.setProgress(ratio);
      expect(engine.state.translate).toBeCloseTo(
        g.expected(`setProgress-step${step}-translate`) as number,
        3,
      );
      expect(engine.state.activeIndex).toBe(g.expected(`setProgress-step${step}-activeIndex`));
    }
  });

  it('slideToClosest snaps to the same slide as the frozen core', () => {
    const params = { slidesPerView: 1, spaceBetween: 0 };
    const engine = makeEngine(5, params);
    for (const [step, ratio] of [0.1, 0.41, 0.6, 0.9].entries()) {
      engine.setProgress(ratio);
      engine.slideToClosest({ speed: 0 });
      expect(engine.state.activeIndex).toBe(g.expected(`slideToClosest-step${step}-activeIndex`));
      expect(engine.state.translate).toBeCloseTo(
        g.expected(`slideToClosest-step${step}-translate`) as number,
        3,
      );
    }
  });
});
