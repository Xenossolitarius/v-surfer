import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

const g = golden('drag-loop');
afterAll(() => g.save());

function makeEngine(count: number, params: Record<string, unknown>) {
  // Default threshold (5px) — both engines arm on the first crossing (see driveDrag).
  const engine = createEngine<number>(
    { slidesPerView: 1, spaceBetween: 0, speed: 0, ...params },
    { scheduler: (fn) => fn() },
  );
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

/** Drive a horizontal drag (a sequence of absolute pageX along y=100) into the engine. */
function driveDrag(
  engine: ReturnType<typeof makeEngine>,
  xs: number[], // xs[0] = down position, the rest are moves; release at the last
) {
  const y = 100;
  engine.pointerStart({ x: xs[0], y, time: 0 });
  // Arm the threshold: the first move past 5px re-anchors and holds (Mechanism B).
  // Inject a small same-direction nudge to arm, then play the real moves as travel.
  const armX = xs[0] + Math.sign(xs[1] - xs[0]) * 8;
  engine.pointerMove({ x: armX, y, time: 0.5 });
  for (let i = 1; i < xs.length; i += 1) {
    engine.pointerMove({ x: xs[i], y, time: i });
  }
  engine.pointerEnd({ x: xs[xs.length - 1], y, time: xs.length });
}

function assertDragParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  const s = engine.state;
  expect(s.activeIndex).toBe(g.expected(`${keyPrefix}:activeIndex`));
  expect(s.realIndex).toBe(g.expected(`${keyPrefix}:realIndex`));
  expect(Math.round(s.translate)).toBe(g.expected(`${keyPrefix}:translate`));
}

describe('drag-loop differential — harness fidelity (non-loop baseline)', () => {
  it('a non-loop drag matches frozen (validates the harness before loop branches exist)', () => {
    const engine = makeEngine(8, { loop: false });
    // start at index 2, drag left (next) a bit, release
    engine.slideTo(2, { speed: 0 });
    driveDrag(engine, [400, 300, 250]); // drag left ~150px
    assertDragParity(engine, 'non-loop-baseline');
  });
});

describe('drag-loop differential — single-swipe wrap', () => {
  it('drag prev from real-0 wraps to the last real slide', () => {
    const engine = makeEngine(8, { loop: true });
    // at index 0, drag RIGHT (prev) far enough to snap one slide back
    driveDrag(engine, [200, 500, 700]); // drag right ~500px
    assertDragParity(engine, 'wrap-prev-real0');
    expect(engine.state.realIndex).toBe(g.expected('wrap-prev-real0:realIndex'));
    expect(engine.state.realIndex).not.toBe(0); // actually wrapped
  });

  it('drag next from the last real slide wraps to real-0', () => {
    const engine = makeEngine(8, { loop: true });
    engine.slideTo(7, { speed: 0 });
    driveDrag(engine, [700, 400, 200]); // drag left ~500px
    assertDragParity(engine, 'wrap-next-last');
    expect(engine.state.realIndex).not.toBe(7); // actually wrapped
  });

  it('drag next from index 5 with slidesPerView:3 wraps correctly', () => {
    // At index 5 with spv=3, activeIndex + spv = 8 > 8-1=7 → first-move loopFix (append) fires.
    // Drag left (next) by 100px — stays within maxTranslate so mid-drag loopFix does NOT fire.
    const engine = makeEngine(8, { loop: true, slidesPerView: 3 });
    engine.slideTo(5, { speed: 0 });
    driveDrag(engine, [500, 400]); // drag left 100px
    assertDragParity(engine, 'wrap-spv3-idx5');
    // non-degeneracy: loopOrder was actually rotated (realIndex advanced)
    expect(engine.state.realIndex).toBe(g.expected('wrap-spv3-idx5:realIndex'));
    expect(engine.state.realIndex).not.toBe(5);
  });

  it('drag next from near-end with slidesPerGroup:2 wraps correctly', () => {
    // At index 6 with spg=2, activeColIndex + spv = 7 > 8-2=6 → first-move loopFix (append) fires.
    // Drag left 100px — stays within maxTranslate so mid-drag loopFix does NOT fire.
    // non-degeneracy: realIndex wraps from 6 → 0 (two slides appended shift the active real slide).
    const engine = makeEngine(8, { loop: true, slidesPerGroup: 2 });
    engine.slideTo(6, { speed: 0 });
    driveDrag(engine, [500, 400]); // drag left 100px
    assertDragParity(engine, 'wrap-spg2-idx6');
    // non-degeneracy: realIndex changed (loop rotation happened)
    expect(engine.state.realIndex).toBe(g.expected('wrap-spg2-idx6:realIndex'));
    expect(engine.state.realIndex).not.toBe(6);
  });
});

describe('drag-loop differential — mid-drag reversal', () => {
  it('drag one way past an edge, reverse without release, then settle — matches frozen (spv1)', () => {
    const engine = makeEngine(8, { loop: true });
    // at index 0, drag right (prev) across the seam, then reverse left and settle.
    // Two-phase drive: Phase A moves forward to the apex to prove the seam was crossed,
    // then Phase B drives the reversal and release (which nets back to start by design).
    const xs = [400, 600, 800, 600, 450];
    const apexIdx = 2; // xs[2]=800 is the turning point; seam-cross happens at xs[1]=600
    const startRealIndex = 0; // test starts at index 0
    const y = 100;

    // --- Phase A: down + forward moves up to and including the apex (no release) ---
    engine.pointerStart({ x: xs[0], y, time: 0 });
    // arm the threshold (same-direction nudge) so the engine re-anchors before driving
    const armX = xs[0] + Math.sign(xs[1] - xs[0]) * 8;
    engine.pointerMove({ x: armX, y, time: 0.5 });
    for (let i = 1; i <= apexIdx; i += 1) {
      engine.pointerMove({ x: xs[i], y, time: i });
    }
    // Apex assertion: the forward drag crossed the seam, so realIndex must have wrapped away
    // from the start (0 → 7 in LTR prev-direction drag on an 8-slide loop).
    expect(engine.state.realIndex).not.toBe(startRealIndex);

    // --- Phase B: reversal moves, then release ---
    for (let i = apexIdx + 1; i < xs.length; i += 1) {
      engine.pointerMove({ x: xs[i], y, time: i });
    }
    engine.pointerEnd({ x: xs[xs.length - 1], y, time: xs.length });

    assertDragParity(engine, 'reversal-spv1');
    // non-degeneracy: reversal nets back to start (0) by design — the mid-drag loopFix fired
    // (reversal path exercised) but the reversed release snaps back to realIndex 0.
    expect(engine.state.realIndex).toBe(startRealIndex);
  });

  it('drag next then reverse back, settle — matches frozen (spv3)', () => {
    const engine = makeEngine(8, { loop: true, slidesPerView: 3 });
    engine.slideTo(5, { speed: 0 });
    // drag left (next) past edge, then reverse right and settle
    driveDrag(engine, [500, 300, 100, 300, 450]);
    assertDragParity(engine, 'reversal-spv3');
    // non-degeneracy: reversal nets back to start (5) by design — loopFix fired during drag
    // but the reversed release snaps back to realIndex 5.
    expect(engine.state.realIndex).toBe(5);
  });

  it('drag next then reverse back, settle — matches frozen (spg2)', () => {
    const engine = makeEngine(8, { loop: true, slidesPerGroup: 2 });
    engine.slideTo(6, { speed: 0 });
    // drag left (next), then reverse right and settle
    driveDrag(engine, [500, 300, 100, 300, 450]);
    assertDragParity(engine, 'reversal-spg2');
    // non-degeneracy: reversal nets back to start (6) by design — loopFix fired during drag
    // but the reversed release snaps back to realIndex 6.
    expect(engine.state.realIndex).toBe(6);
  });
});

describe('drag-loop differential — long multi-batch drag (edge-cross)', () => {
  it('a long left drag that crosses the seam more than once matches frozen', () => {
    const engine = makeEngine(8, { loop: true });
    engine.slideTo(6, { speed: 0 });
    // many small left steps so currentTranslate marches past maxTranslate repeatedly
    const xs = [700];
    for (let x = 680; x >= -1600; x -= 80) xs.push(x);
    driveDrag(engine, xs);
    assertDragParity(engine, 'long-drag-spv1');
    // non-degeneracy: the long drag actually moved off the start slide (realIndex 6 → 1)
    expect(engine.state.realIndex).not.toBe(6);
  });

  it('a long left drag with slidesPerView:3 crosses the seam and matches frozen', () => {
    const engine = makeEngine(8, { loop: true, slidesPerView: 3 });
    engine.slideTo(5, { speed: 0 });
    // drag left far enough to cross the group boundary more than once
    const xs = [600];
    for (let x = 560; x >= -1600; x -= 80) xs.push(x);
    driveDrag(engine, xs);
    assertDragParity(engine, 'long-drag-spv3');
    // non-degeneracy: loopOrder must have been rotated multiple times
    expect(engine.state.realIndex).toBe(g.expected('long-drag-spv3:realIndex'));
  });

  it('a long left drag with slidesPerGroup:2 crosses the seam and matches frozen', () => {
    const engine = makeEngine(8, { loop: true, slidesPerGroup: 2 });
    engine.slideTo(6, { speed: 0 });
    // drag left far enough to cross the group boundary multiple times
    const xs = [600];
    for (let x = 560; x >= -1600; x -= 80) xs.push(x);
    driveDrag(engine, xs);
    assertDragParity(engine, 'long-drag-spg2');
    // non-degeneracy: realIndex must have advanced through the loop
    expect(engine.state.realIndex).toBe(g.expected('long-drag-spg2:realIndex'));
  });
});

describe('threshold differential — re-anchor + dead zone (default threshold 5)', () => {
  it('a sub-threshold drag moves neither engine (dead zone)', () => {
    const engine = makeEngine(8, { loop: false });
    engine.slideTo(2, { speed: 0 });
    const y = 100;
    engine.pointerStart({ x: 400, y, time: 0 });
    engine.pointerMove({ x: 397, y, time: 1 }); // 3px < 5 → below threshold
    engine.pointerEnd({ x: 397, y, time: 2 });
    expect(engine.state.activeIndex).toBe(2);
    assertDragParity(engine, 'thresh-dead-zone');
  });

  it('crossing the threshold re-anchors so the slide never jumps by the threshold (non-loop)', () => {
    const engine = makeEngine(8, { loop: false });
    engine.slideTo(2, { speed: 0 }); // translate -1600
    const y = 100;
    engine.pointerStart({ x: 400, y, time: 0 });
    // arming frame: 10px > 5 → engine re-anchors and HOLDS (no jump off -1600)
    engine.pointerMove({ x: 390, y, time: 1 });
    expect(Math.round(engine.state.translate)).toBe(g.expected('thresh-reanchor:translate-arm'));
    expect(Math.round(engine.state.translate)).toBe(-1600); // held — no 10px jump
    // travel frame: follows 1:1 from the re-anchored origin (390)
    engine.pointerMove({ x: 290, y, time: 2 });
    expect(Math.round(engine.state.translate)).toBe(g.expected('thresh-reanchor:translate-travel'));
    engine.pointerEnd({ x: 290, y, time: 3 });
    assertDragParity(engine, 'thresh-reanchor');
  });

  it('a loop wrap under the default threshold arms then wraps, matching frozen', () => {
    const engine = makeEngine(8, { loop: true });
    const y = 100;
    // at index 0, drag right (prev) across the seam: arm (8px) then travel far
    engine.pointerStart({ x: 200, y, time: 0 });
    let t = 0;
    for (const x of [208, 450, 700]) {
      t += 1;
      engine.pointerMove({ x, y, time: t });
    }
    engine.pointerEnd({ x: 700, y, time: t + 1 });
    assertDragParity(engine, 'thresh-loop-wrap');
    expect(engine.state.realIndex).toBe(g.expected('thresh-loop-wrap:realIndex'));
    expect(engine.state.realIndex).not.toBe(0); // wrapped backward
  });
});
