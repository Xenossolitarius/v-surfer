import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

const g = golden('rewind');
afterAll(() => g.save());

function makeEngine(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>(
    { slidesPerView: 1, spaceBetween: 0, speed: 0, ...params },
    { scheduler: (fn) => fn() },
  );
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

function assertParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  const s = engine.state;
  expect(s.activeIndex).toBe(g.expected(`${keyPrefix}:activeIndex`));
  expect(s.realIndex).toBe(g.expected(`${keyPrefix}:realIndex`));
  expect(Math.round(s.translate)).toBe(g.expected(`${keyPrefix}:translate`));
}

describe('rewind differential — programmatic slideNext/slidePrev', () => {
  it('slideNext at the last slide rewinds to 0 (rewind:true)', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(7, { speed: 0 });
    engine.slideNext({ speed: 0 });
    expect(engine.state.activeIndex).toBe(0);
    assertParity(engine, 'slideNext-last-rewind');
  });

  it('slidePrev at the first slide rewinds to the last (rewind:true)', () => {
    const engine = makeEngine(8, { rewind: true });
    // both start at index 0 (isBeginning)
    engine.slidePrev({ speed: 0 });
    expect(engine.state.activeIndex).toBe(7);
    assertParity(engine, 'slidePrev-first-rewind');
  });

  it('slideNext at a non-edge steps normally (rewind:true, no rewind)', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(3, { speed: 0 });
    engine.slideNext({ speed: 0 });
    expect(engine.state.activeIndex).toBe(4);
    assertParity(engine, 'slideNext-nonedge');
  });

  it('slidePrev at a non-edge steps normally (rewind:true, no rewind)', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(3, { speed: 0 });
    engine.slidePrev({ speed: 0 });
    expect(engine.state.activeIndex).toBe(2);
    assertParity(engine, 'slidePrev-nonedge');
  });

  it('rewind:false — slideNext at the last slide stays clamped (regression guard)', () => {
    const engine = makeEngine(8, { rewind: false });
    engine.slideTo(7, { speed: 0 });
    engine.slideNext({ speed: 0 });
    expect(engine.state.activeIndex).toBe(7);
    assertParity(engine, 'slideNext-last-noRewind');
  });

  it('rewind:false — slidePrev at the first slide stays clamped (regression guard)', () => {
    const engine = makeEngine(8, { rewind: false });
    engine.slidePrev({ speed: 0 });
    expect(engine.state.activeIndex).toBe(0);
    assertParity(engine, 'slidePrev-first-noRewind');
  });

  it('slideNext at the end with slidesPerView:3 rewinds to 0', () => {
    const engine = makeEngine(8, { rewind: true, slidesPerView: 3 });
    engine.slideTo(7, { speed: 0 }); // clamps to the last reachable index (isEnd)
    expect(engine.state.isEnd).toBe(true);
    engine.slideNext({ speed: 0 });
    expect(engine.state.activeIndex).toBe(0);
    assertParity(engine, 'slideNext-spv3-rewind');
  });
});

// Drive a horizontal drag into the headless engine. `releaseTime` (ms) sets timeDiff
// — < 300 short, > 300 long. The first move is a small same-direction nudge to arm
// the default threshold (5px), then the real moves play as travel.
function driveDrag(engine: ReturnType<typeof makeEngine>, xs: number[], releaseTime: number) {
  const y = 100;
  engine.pointerStart({ x: xs[0], y, time: 0 });
  const armX = xs[0] + Math.sign(xs[1] - xs[0]) * 8;
  engine.pointerMove({ x: armX, y, time: 0.5 });
  for (let i = 1; i < xs.length; i += 1) {
    engine.pointerMove({ x: xs[i], y, time: i });
  }
  engine.pointerEnd({ x: xs[xs.length - 1], y, time: releaseTime });
}

describe('rewind differential — drag release', () => {
  // The engine uses explicit `time:` parameters so timeDiff is deterministic without
  // fake timers. < 300ms → short swipe, > 300ms → long swipe.
  const LONG = 400; // > longSwipesMs → long swipe
  const SHORT = 10; // < longSwipesMs → short swipe

  it('long next-swipe at the last slide rewinds to 0', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(7, { speed: 0 });
    // at the end (isEnd), drag far LEFT (next) so ratio >= longSwipesRatio
    driveDrag(engine, [700, 200, -300, -800], LONG);
    expect(engine.state.activeIndex).toBe(0);
    assertParity(engine, 'drag-long-next-last');
  });

  it('short next-swipe at the last slide rewinds to 0', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(7, { speed: 0 });
    // short next at the end → rewind to 0 regardless of ratio (rewindFirstIndex=0)
    driveDrag(engine, [700, 600, 500], SHORT);
    expect(engine.state.activeIndex).toBe(0);
    assertParity(engine, 'drag-short-next-last');
  });

  it('long prev-swipe at the first slide rewinds to the last', () => {
    const engine = makeEngine(8, { rewind: true });
    // starts at index 0 (isBeginning)
    // drag far RIGHT (prev) past the start so ratio < 0 && |ratio| > longSwipesRatio
    driveDrag(engine, [200, 700, 1200, 1700], LONG);
    expect(engine.state.activeIndex).toBe(7);
    assertParity(engine, 'drag-long-prev-first');
  });

  it('short prev-swipe at the first slide rewinds to the last', () => {
    const engine = makeEngine(8, { rewind: true });
    // short prev at the start → rewind to last regardless of ratio (rewindLastIndex=7)
    driveDrag(engine, [200, 300, 400], SHORT);
    expect(engine.state.activeIndex).toBe(7);
    assertParity(engine, 'drag-short-prev-first');
  });

  it('a non-edge drag with rewind:true snaps normally (fall-through, no rewind)', () => {
    const engine = makeEngine(8, { rewind: true });
    engine.slideTo(3, { speed: 0 });
    driveDrag(engine, [400, 300, 250], SHORT); // small next drag, mid-list
    // neither edge → rewind indices null → ordinary snap; not an edge landing
    expect(engine.state.activeIndex).not.toBe(0);
    expect(engine.state.activeIndex).not.toBe(7);
    assertParity(engine, 'drag-nonedge');
  });

  it('rewind:false — short next-swipe at the last slide stays (regression guard)', () => {
    const engine = makeEngine(8, { rewind: false });
    engine.slideTo(7, { speed: 0 });
    driveDrag(engine, [700, 600, 500], SHORT);
    expect(engine.state.activeIndex).toBe(7); // no rewind
    assertParity(engine, 'drag-short-next-noRewind');
  });
});
