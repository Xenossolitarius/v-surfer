import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

const g = golden('manipulation');
afterAll(() => g.save());

function makeEngine(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

function assertParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  const z = (n: number) => (n === 0 ? 0 : n);
  const za = (arr: number[]) => arr.map(z);
  const s = engine.state;
  expect(za(s.slidesSizesGrid)).toEqual(za(g.expected(`${keyPrefix}:slidesSizesGrid`) as number[]));
  expect(za(s.slidesGrid)).toEqual(za(g.expected(`${keyPrefix}:slidesGrid`) as number[]));
  expect(za(s.snapGrid)).toEqual(za(g.expected(`${keyPrefix}:snapGrid`) as number[]));
  expect(z(s.translate)).toBe(z(g.expected(`${keyPrefix}:translate`) as number));
  expect(s.activeIndex).toBe(g.expected(`${keyPrefix}:activeIndex`));
  expect(s.isBeginning).toBe(g.expected(`${keyPrefix}:isBeginning`));
  expect(s.isEnd).toBe(g.expected(`${keyPrefix}:isEnd`));
  expect(s.progress).toBeCloseTo(g.expected(`${keyPrefix}:progress`) as number, 6);
}

const params = { slidesPerView: 1, spaceBetween: 0 };

describe('differential: manipulation (non-loop)', () => {
  it('append keeps active put', () => {
    const e = makeEngine(5, params);
    e.slideTo(2, { speed: 0 });
    e.appendSlide({ data: 5 });
    assertParity(e, 'append-keep-active');
  });

  it('prepend shifts active', () => {
    const e = makeEngine(5, params);
    e.slideTo(2, { speed: 0 });
    e.prependSlide([{ data: -2 }, { data: -1 }]);
    assertParity(e, 'prepend-shifts-active');
  });

  it('addSlide before, at, and after the active index', () => {
    for (const at of [1, 2, 4]) {
      const e = makeEngine(5, params);
      e.slideTo(2, { speed: 0 });
      e.addSlide(at, { data: 100 + at });
      assertParity(e, `addSlide-at-${at}`);
    }
  });

  it('removeSlide below / at / above the active index, single and batch', () => {
    const cases: Array<number | number[]> = [0, 2, 4, [0, 1], [3, 4]];
    for (const idxs of cases) {
      const e = makeEngine(6, params);
      e.slideTo(3, { speed: 0 });
      e.removeSlide(idxs);
      assertParity(e, `removeSlide-${Array.isArray(idxs) ? idxs.join('') : idxs}`);
    }
  });

  it('removeAllSlides then re-append rebuilds layout identically', () => {
    const e = makeEngine(5, params);
    e.slideTo(3, { speed: 0 });
    e.removeAllSlides();
    assertParity(e, 'removeAll-empty');
    e.appendSlide([{ data: 0 }, { data: 1 }, { data: 2 }]);
    assertParity(e, 'removeAll-reappend');
  });
});

// ---------------------------------------------------------------------------
// Loop differential helpers
// ---------------------------------------------------------------------------

function assertLoopParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  assertParity(engine, keyPrefix);
  expect(engine.state.realIndex).toBe(g.expected(`${keyPrefix}:realIndex`));
}

function makeLoopEngine(count: number) {
  const engine = createEngine<number>(
    { slidesPerView: 1, spaceBetween: 0, loop: true },
    { scheduler: (fn) => fn() },
  );
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

describe('differential: manipulation (loop)', () => {
  // NOTE: oracle.slideToLoop is a no-op in JSDOM (loop DOM rotation requires real CSS
  // layout to measure slide sizes; without it loopFix bails without repositioning).
  // We use slideTo for both sides to land both models in the same coordinate position
  // before exercising the mutation. The loop differential is still meaningful: both
  // models are initialised with loop:true and the mutation paths execute their loop
  // re-derivation logic; what we verify is that the resulting state is identical.
  it('append preserves the active real index', () => {
    const e = makeLoopEngine(6);
    e.slideTo(3, { speed: 0 });
    e.appendSlide({ data: 6 });
    assertLoopParity(e, 'loop-append-preserve-realidx');
  });

  it('prepend preserves the active real index', () => {
    const e = makeLoopEngine(6);
    e.slideTo(3, { speed: 0 });
    e.prependSlide({ data: -1 });
    assertLoopParity(e, 'loop-prepend-preserve-realidx');
  });

  it('removeSlide below the active real index', () => {
    const e = makeLoopEngine(6);
    e.slideTo(4, { speed: 0 });
    e.removeSlide(0);
    assertLoopParity(e, 'loop-removeSlide-below');
  });

  it('removeAllSlides under loop matches the oracle empty state', () => {
    const e = makeLoopEngine(6);
    e.slideToLoop(3, { speed: 0 });
    e.removeAllSlides();
    assertLoopParity(e, 'loop-removeAll-empty');
  });

  it('removeAllSlides then re-append under loop round-trips to oracle state', () => {
    const e = makeLoopEngine(6);
    e.slideToLoop(3, { speed: 0 });
    e.removeAllSlides();
    e.appendSlide([{ data: 0 }, { data: 1 }, { data: 2 }]);
    assertLoopParity(e, 'loop-removeAll-reappend');
  });

  // Distinguishing config: slidesPerView:3, slidesPerGroup:1 with 8 slides.
  // ceil(slidesPerView)=3, slidesPerGroup=1, loopedSlidesCount(params)=1 — these three
  // candidate formulas all yield DIFFERENT empty-loop activeIndex values, so the oracle
  // (frozen Surfer core) is the definitive arbiter of the correct formula.
  function makeLoopEngineSpv3(count: number) {
    const e = createEngine<number>(
      { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 0, loop: true },
      { scheduler: (fn) => fn() },
    );
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
    return e;
  }

  it('spv3/spg1: removeAllSlides empty-loop activeIndex matches the oracle', () => {
    const e = makeLoopEngineSpv3(8);
    e.slideTo(4, { speed: 0 });
    e.removeAllSlides();
    // Assert against oracle — do not hardcode expected activeIndex
    assertLoopParity(e, 'loop-spv3-removeAll-empty');
  });

  it('spv3/spg1: removeAllSlides then re-append round-trips to oracle state', () => {
    const e = makeLoopEngineSpv3(8);
    e.slideTo(4, { speed: 0 });
    e.removeAllSlides();
    // Round-trip: append 4 fresh slides on both sides and assert parity
    e.appendSlide([{ data: 0 }, { data: 1 }, { data: 2 }, { data: 3 }]);
    assertLoopParity(e, 'loop-spv3-removeAll-reappend');
  });

  // ---------------------------------------------------------------------------
  // Near-edge cases: positions where computeLoopFix WOULD fire (within slidesPerView
  // of the start or end). These verify applySlideTo (the current path) vs the prior
  // slideToLoopInternal path after mutation with loop:true.
  // ---------------------------------------------------------------------------

  // spv1/spg1, 6 slides: navigate to LAST index (5) then appendSlide.
  // loopedSlides=1, spv=1, cols after append=7. In the engine's identity loopOrder,
  // slideToLoopTarget(clamped=5, {order:[0..6]}) gives targetPosition=5,
  // needFix = 7-5=2 which is NOT < 1 — so applySlideTo and slideToLoopInternal
  // are identical here. Both paths produce the same post-append oracle state.
  it('near-edge spv1: append at last index', () => {
    const e = makeLoopEngine(6);
    // Navigate to the last logical index (5) — near the loop edge
    e.slideTo(5, { speed: 0 });
    e.appendSlide({ data: 6 });
    assertLoopParity(e, 'loop-near-append-last');
  });

  // spv1/spg1, 6 slides: navigate to index 0 then prependSlide
  // loopedSlides=1, cols=6 → near-start when activeIndex < 1 i.e. at index 0.
  it('near-edge spv1: prepend at index 0', () => {
    const e = makeLoopEngine(6);
    e.slideTo(0, { speed: 0 });
    e.prependSlide({ data: -1 });
    assertLoopParity(e, 'loop-near-prepend-idx0');
  });

  // spv1/spg1, 6 slides: navigate near the end (index 4), then removeSlide(0) below
  // the active. Active shifts to 3 (4-1). The oracle's loopFix inside
  // recalcSlidesAndUpdate sees the active DOM element at new position 3 (cols=5,
  // loopedSlides=1): 3+1=4 ≤ 4, no DOM rotation — clean oracle path for differential.
  it('near-edge spv1: removeSlide below active while near the end (active=4, remove=0)', () => {
    const e = makeLoopEngine(6);
    e.slideTo(4, { speed: 0 });
    e.removeSlide(0);
    assertLoopParity(e, 'loop-near-remove-active4-below');
  });

  // spv3/spg1, 8 slides: navigate near the end then appendSlide
  // loopedSlides=1, cols=8, spv=3 → near-end when activeIndex+3 > 8-1=7 i.e. at index 6 or 7.
  it('near-edge spv3: append while near the end (index 6)', () => {
    const e = makeLoopEngineSpv3(8);
    e.slideTo(6, { speed: 0 });
    e.appendSlide({ data: 8 });
    assertLoopParity(e, 'loop-near-spv3-append-idx6');
  });

  // spv3/spg1, 8 slides: navigate near the start (index 0) then prependSlide
  // loopedSlides=1, cols=8, spv=3 → near-start when activeIndex < 1 i.e. at index 0.
  it('near-edge spv3: prepend while near the start (index 0)', () => {
    const e = makeLoopEngineSpv3(8);
    e.slideTo(0, { speed: 0 });
    e.prependSlide({ data: -1 });
    assertLoopParity(e, 'loop-near-spv3-prepend-idx0');
  });
});
