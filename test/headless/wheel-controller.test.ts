import { describe, it, expect } from 'vitest';
import {
  WheelController,
  type WheelControllerParams,
  type WheelEdges,
} from '../../src/headless/mousewheel';

const MIDDLE: WheelEdges = { isBeginning: false, isEnd: false, loop: false };
const discrete = (over: Partial<WheelControllerParams> = {}): WheelControllerParams => ({
  freeMode: false,
  sticky: false,
  releaseOnEdges: false,
  thresholdDelta: null,
  thresholdTime: null,
  sensitivity: 1,
  ...over,
});

describe('WheelController — discrete', () => {
  it('first downward wheel slides next', () => {
    const c = new WheelController(discrete());
    // delta < 0 → next. time 1000, lastScrollTime starts 0 so the <60ms debounce does not trip.
    const out = c.step(-100, 1000, MIDDLE);
    expect(out.effect).toEqual({ kind: 'slide', dir: 'next' });
    expect(out.preventDefault).toBe(true);
  });
  it('upward wheel slides prev', () => {
    const c = new WheelController(discrete());
    expect(c.step(100, 1000, MIDDLE).effect).toEqual({ kind: 'slide', dir: 'prev' });
  });
  it('a same-direction non-larger event within 150ms does not re-slide', () => {
    const c = new WheelController(discrete());
    c.step(-100, 1000, MIDDLE); // slides, lastScrollTime = 1000
    // second event 1010ms: |delta|>=6 && 1010-1000<60 → animateSlider debounce → none (but preventDefault)
    const out = c.step(-100, 1010, MIDDLE);
    expect(out.effect).toEqual({ kind: 'none' });
    expect(out.preventDefault).toBe(true);
  });
  it('a later same-direction event (>150ms apart, past debounce) slides again', () => {
    const c = new WheelController(discrete());
    c.step(-100, 1000, MIDDLE);
    const out = c.step(-100, 1200, MIDDLE); // 200ms later → shouldAnimate, past 60ms debounce
    expect(out.effect).toEqual({ kind: 'slide', dir: 'next' });
  });
  it('thresholdDelta gates small deltas', () => {
    const c = new WheelController(discrete({ thresholdDelta: 50 }));
    expect(c.step(-10, 1000, MIDDLE).effect).toEqual({ kind: 'none' });
  });
  it('at the end with releaseOnEdges and no loop → none + do not preventDefault', () => {
    const c = new WheelController(discrete({ releaseOnEdges: true }));
    const out = c.step(-100, 1000, { isBeginning: false, isEnd: true, loop: false });
    expect(out.effect).toEqual({ kind: 'none' });
    expect(out.preventDefault).toBe(false);
  });
  it('at the end with loop still slides next', () => {
    const c = new WheelController(discrete());
    expect(c.step(-100, 1000, { isBeginning: false, isEnd: true, loop: true }).effect).toEqual({
      kind: 'slide',
      dir: 'next',
    });
  });
});

describe('WheelController — free mode', () => {
  const free = (over: Partial<WheelControllerParams> = {}): WheelControllerParams => ({
    freeMode: true,
    sticky: false,
    releaseOnEdges: false,
    thresholdDelta: null,
    thresholdTime: null,
    sensitivity: 1,
    ...over,
  });
  it('emits a scrub equal to delta*sensitivity', () => {
    const c = new WheelController(free({ sensitivity: 2 }));
    const out = c.step(-30, 1000, MIDDLE);
    expect(out.effect).toEqual({ kind: 'scrub', targetDelta: -60 });
    expect(out.preventDefault).toBe(true);
  });
  it('sticky: a 500ms-silent fallback schedules a 0.5-threshold snap (due after 500ms)', () => {
    const c = new WheelController(free({ sticky: true }));
    c.step(-30, 1000, MIDDLE);
    expect(c.due(1400)).toBeNull(); // not yet
    expect(c.due(1500)).toEqual({ kind: 'snap', threshold: 0.5 });
    expect(c.due(1600)).toBeNull(); // consumed
  });
});
