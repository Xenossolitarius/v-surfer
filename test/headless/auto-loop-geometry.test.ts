import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

// Variable per-slide widths keyed by REAL slide index: 120,180,240,300,120,...
const realWidth = (n: number): number => 120 + (n % 4) * 60;
const N = 8;

function makeAutoLoopEngine(count = N) {
  const engine = createEngine<number>(
    { loop: true, slidesPerView: 'auto', spaceBetween: 0 },
    { scheduler: (fn) => fn() },
  );
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  // Real-index-keyed sizes (the new setGeometry contract): sizes[realIndex] = width.
  engine.setGeometry({
    containerSize: 800,
    sizes: Array.from({ length: count }, (_, r) => realWidth(r)),
  });
  return engine;
}

// slidesSizesGrid[i] must equal the width of the slide currently at layout position i.
function sizeInvariantHolds(engine: ReturnType<typeof makeAutoLoopEngine>): boolean {
  const s = engine.state;
  return s.slidesSizesGrid.every((sz, i) => sz === realWidth(s.slides[i].realIndex));
}
// Non-centered: the active slide sits flush at the container's left edge.
function flushLeftResidual(engine: ReturnType<typeof makeAutoLoopEngine>): number {
  const s = engine.state;
  return s.translate + s.slidesGrid[s.activeIndex];
}

describe('auto + loop geometry', () => {
  it('rebuilds the grid for the rotated order across programmatic nav (no re-measure)', () => {
    const e = makeAutoLoopEngine();
    let allSizesMatch = sizeInvariantHolds(e);
    let allFlushLeft = Math.abs(flushLeftResidual(e)) < 0.5;
    let rotatedAtLeastOnce = false;
    const step = () => {
      if (e.state.slides[0].realIndex !== 0) rotatedAtLeastOnce = true;
      if (!sizeInvariantHolds(e)) allSizesMatch = false;
      if (Math.abs(flushLeftResidual(e)) >= 0.5) allFlushLeft = false;
    };
    for (let i = 0; i < 2 * N; i += 1) {
      e.slideNext({ speed: 0 });
      step();
    }
    for (let i = 0; i < 2 * N; i += 1) {
      e.slidePrev({ speed: 0 });
      step();
    }
    expect(rotatedAtLeastOnce).toBe(true); // the test actually exercised a rotation
    expect(allSizesMatch).toBe(true);
    expect(allFlushLeft).toBe(true);
  });

  it('rebuilds the grid for the rotated order across slideToLoop (no re-measure)', () => {
    const e = makeAutoLoopEngine();
    let allSizesMatch = true;
    let rotatedAtLeastOnce = false;
    // slideToLoop to a spread of real indexes; each may rotate loopOrder, and the
    // grid must follow via rebuildGrid() in slideToLoopInternal. We assert only the
    // (clamp-independent) size invariant here — flush-left does not hold at the
    // grid's end-clamp, which 'auto' slideToLoop can legitimately land on.
    for (const realIndex of [4, 7, 2, 6, 0, 5, 1]) {
      e.slideToLoop(realIndex, { speed: 0 });
      if (e.state.slides[0].realIndex !== 0) rotatedAtLeastOnce = true;
      if (!sizeInvariantHolds(e)) allSizesMatch = false;
    }
    expect(rotatedAtLeastOnce).toBe(true); // the test actually exercised a rotation
    expect(allSizesMatch).toBe(true);
  });

  it('keeps the active slide flush-left under loop at narrow containers (no visual clamp)', () => {
    // At realistic column widths several 'auto' slides are visible, so a loopedSlides
    // buffer of 1 (slidesPerGroup default) is too small: the active slide can't reach
    // its flush-left position near the grid end and visibly clamps (a sliver of the
    // previous slide shows). The engine auto-buffers loopedSlides for 'auto', so the
    // active stays flush-left (residual 0) at every step. (isEnd may still be true at
    // a buffer edge — harmless: navigation stays enabled under loop and the slide is
    // flush — so it is not asserted here.)
    for (const container of [300, 400, 500, 600, 800]) {
      const e = createEngine<number>(
        { loop: true, slidesPerView: 'auto', spaceBetween: 0 },
        { scheduler: (fn) => fn() },
      );
      e.setSlides(Array.from({ length: N }, (_, i) => ({ data: i })));
      e.setGeometry({
        containerSize: container,
        sizes: Array.from({ length: N }, (_, r) => realWidth(r)),
      });
      let worstResidual = 0;
      for (let i = 0; i < 2 * N; i += 1) {
        e.slideNext({ speed: 0 });
        const s = e.state;
        worstResidual = Math.max(
          worstResidual,
          Math.abs(s.translate + s.slidesGrid[s.activeIndex]),
        );
      }
      expect(worstResidual, `container ${container}`).toBeLessThan(0.5);
    }
  });

  it('keeps the grid in sync with the order across a drag-wrap (size invariant)', () => {
    // A drag that wraps rotates loopOrder mid-gesture; the grid must follow it, else
    // 'auto' slide sizes (and the visibility flags derived from them) go stale and
    // visible slides get mis-marked. Drag left far enough to force at least one wrap.
    const e = makeAutoLoopEngine();
    let x = 2000;
    const y = 100;
    let t = 0;
    e.pointerStart({ x, y, time: t });
    const startOrder = e.state.slides.map((c) => c.realIndex).join(',');
    let wrapped = false;
    for (let k = 0; k < 60; k += 1) {
      x -= 60;
      t += 16;
      e.pointerMove({ x, y, time: t });
      if (e.state.slides.map((c) => c.realIndex).join(',') !== startOrder) wrapped = true;
      // grid must track the (possibly just-rotated) order on every drag frame
      if (!sizeInvariantHolds(e)) throw new Error(`size invariant broke mid-drag at frame ${k}`);
    }
    t += 16;
    e.pointerEnd({ x, y, time: t });
    expect(wrapped).toBe(true); // the drag actually exercised a wrap
    expect(sizeInvariantHolds(e)).toBe(true); // settled grid matches the rendered order
  });

  it('keeps the invariants after appending a slide under auto + loop', () => {
    const e = makeAutoLoopEngine();
    e.slideNext({ speed: 0 });
    e.slideNext({ speed: 0 });
    e.appendSlide({ data: N }); // new real index N
    // Consumer re-measures after a slide-set change (real-index keyed, incl. new slide).
    e.setGeometry({
      containerSize: 800,
      sizes: Array.from({ length: N + 1 }, (_, r) => realWidth(r)),
    });
    expect(
      e.state.slidesSizesGrid.every((sz, i) => sz === realWidth(e.state.slides[i].realIndex)),
    ).toBe(true);
    expect(Math.abs(flushLeftResidual(e))).toBeLessThan(0.5);
  });
});
