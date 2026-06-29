import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

/** Loop engine with an explicit scheduler so deferral timing is deterministic. */
function makeLoopEngine(
  count: number,
  params: Record<string, unknown>,
  scheduler: (fn: () => void) => void,
) {
  const engine = createEngine<number>({ ...params, loop: true }, { scheduler });
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

describe('loop wrap transition: engine owns the frame boundary', () => {
  it('a backward wrap from index 0 paints the reposition baseline (dur 0), then defers the final (dur speed)', () => {
    let deferred: (() => void) | null = null;
    const engine = makeLoopEngine(8, { slidesPerView: 1, spaceBetween: 0, speed: 300 }, (fn) => {
      deferred = fn;
    });

    // At index 0, slidePrev triggers loopFix('prev') → reposition committed inline, final deferred.
    engine.slidePrev();
    const reposition = engine.state;
    expect(reposition.transitionDuration).toBe(0); // baseline jump, no animation
    expect(reposition.translate).toBe(-800); // slid one slot to hold the active slide visually
    expect(typeof deferred).toBe('function'); // the final was handed to the scheduler

    deferred!(); // run the scheduled final
    const final = engine.state;
    expect(final.transitionDuration).toBe(300); // animates over the configured speed
    expect(final.translate).toBe(0); // returns to the snap — a real, non-zero delta from -800
    expect(final.translate).not.toBe(reposition.translate);
    expect(final.realIndex).toBe(7); // wrapped backward to the last logical slide
  });

  it('a non-wrap loop step commits synchronously (nothing deferred)', () => {
    let deferred: (() => void) | null = null;
    const engine = makeLoopEngine(8, { slidesPerView: 1, spaceBetween: 0, speed: 300 }, (fn) => {
      deferred = fn;
    });
    engine.slideNext(); // index 0 → 1: the init append is a no-op, so no reposition
    expect(deferred).toBeNull();
    expect(engine.state.activeIndex).toBe(1);
    expect(engine.state.transitionDuration).toBe(300);
  });

  it('a non-loop engine never defers', () => {
    let deferred: (() => void) | null = null;
    const engine = createEngine<number>(
      { slidesPerView: 1, speed: 300 },
      {
        scheduler: (fn) => {
          deferred = fn;
        },
      },
    );
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
    engine.slideNext();
    expect(deferred).toBeNull();
    expect(engine.state.activeIndex).toBe(1);
  });

  it('a second nav flushes the first wrap synchronously, and the stale scheduled callback is inert', () => {
    let deferred: () => void = () => {};
    // loopPreventsSliding:false — this test exercises the flush/frame-boundary mechanic
    // (a second nav settles the first wrap's pending final, then wraps again). With the
    // default loopPreventsSliding:true, the second nav's flushPending() latches `animating`
    // and the guard correctly blocks it (frozen's default behavior, covered by
    // test/headless/loop-prevents-sliding.test.ts). Disable it here to test flush in isolation.
    const engine = makeLoopEngine(
      8,
      { slidesPerView: 1, spaceBetween: 0, speed: 300, loopPreventsSliding: false },
      (fn) => {
        deferred = fn;
      },
    );
    engine.slidePrev(); // wrap #1: final (realIndex 7) deferred
    const stale = deferred; // the scheduler wrapper for wrap #1's final
    engine.slidePrev(); // entry flushPending() applies wrap #1's final, then wrap #2 defers its own final
    stale(); // generation guard ⇒ no-op (must not re-apply wrap #1)
    deferred(); // run wrap #2's final
    expect(engine.state.realIndex).toBe(6); // two backward steps: 0 → 7 → 6
  });

  it('the default scheduler falls back to synchronous when requestAnimationFrame is absent (SSR)', () => {
    // No injected scheduler ⇒ the engine uses defaultScheduler. With rAF unavailable
    // (server render), its guard fails and it runs the final inline, so a wrap settles
    // synchronously instead of stranding the reposition baseline forever.
    const g = globalThis as { requestAnimationFrame?: typeof requestAnimationFrame };
    const original = g.requestAnimationFrame;
    g.requestAnimationFrame = undefined;
    try {
      const engine = createEngine<number>({
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 300,
        loop: true,
      });
      engine.setGeometry({ containerSize: 800 });
      engine.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
      engine.slidePrev(); // a backward wrap; the deferred final must run inline
      expect(engine.state.realIndex).toBe(7);
      expect(engine.state.translate).toBe(0);
      expect(engine.state.transitionDuration).toBe(300);
    } finally {
      g.requestAnimationFrame = original;
    }
  });
});
