import { describe, it, expect } from 'vitest';
import {
  createGestureState,
  gestureStart,
  gestureMove,
  gestureEnd,
} from '../../src/headless/gestures';
import { normalizeParams } from '../../src/headless/params';

describe('gestureStart', () => {
  it('records start coords + time and flags touched', () => {
    const s = createGestureState();
    gestureStart(s, { x: 100, y: 50, time: 1000 });
    expect(s.isTouched).toBe(true);
    expect(s.isMoved).toBe(false);
    expect(s.startX).toBe(100);
    expect(s.startY).toBe(50);
    expect(s.currentX).toBe(100);
    expect(s.touchStartTime).toBe(1000);
    expect(s.startMoving).toBeUndefined();
    expect(s.swipeDirection).toBeUndefined();
  });
});

const slidesGrid = [0, 800, 1600, 2400, 3200];
const baseEnv = {
  params: normalizeParams({ slidesPerView: 1, threshold: 0 }),
  translate: 0,
  minTranslate: 0,
  maxTranslate: -3200,
  slidesGrid,
  slidesSizesGrid: [800, 800, 800, 800, 800],
  activeIndex: 0,
};

describe('gestureMove', () => {
  it('follows the finger left with touchRatio 1', () => {
    const s = createGestureState();
    gestureStart(s, { x: 300, y: 50, time: 0 });
    const r = gestureMove(s, { x: 100, y: 50, time: 16 }, baseEnv);
    expect(r?.translate).toBe(-200);
    expect(s.swipeDirection).toBe('next');
    expect(s.isMoved).toBe(true);
  });

  it('applies edge resistance dragging right at the beginning', () => {
    const s = createGestureState();
    gestureStart(s, { x: 100, y: 50, time: 0 });
    const r = gestureMove(s, { x: 200, y: 50, time: 16 }, baseEnv);
    // -1 + 100**0.85
    expect(r?.translate).toBeCloseTo(-1 + 100 ** 0.85, 6);
    expect(r!.translate).toBeLessThan(100); // resisted below the raw +100
    expect(s.swipeDirection).toBe('prev');
  });
});

describe('gestureEnd', () => {
  function dragTo(translate: number, timeEnd: number) {
    const s = createGestureState();
    gestureStart(s, { x: 500, y: 50, time: 0 });
    gestureMove(s, { x: 500 + translate, y: 50, time: 16 }, baseEnv);
    const env = { ...baseEnv, translate: s.currentTranslate };
    return gestureEnd(s, env, timeEnd);
  }

  it('short flick advances to the next slide', () => {
    // drag left 200px quickly → next
    expect(dragTo(-200, 100)).toBe(1);
  });

  it('long slow drag under ratio snaps back', () => {
    expect(dragTo(-200, 400)).toBe(0);
  });
});

describe('gestureMove velocity tracking', () => {
  const freeEnv = {
    ...baseEnv,
    params: normalizeParams({ slidesPerView: 1, freeMode: true, threshold: 0 }),
  };

  it('captures a seed sample then each move sample when freeMode is on', () => {
    const s = createGestureState();
    gestureStart(s, { x: 500, y: 50, time: 0 });
    gestureMove(s, { x: 470, y: 50, time: 16 }, freeEnv);
    expect(s.velocities).toEqual([
      { position: 500, time: 0 },
      { position: 470, time: 16 },
    ]);
    gestureMove(s, { x: 440, y: 50, time: 32 }, freeEnv);
    expect(s.velocities).toEqual([
      { position: 500, time: 0 },
      { position: 470, time: 16 },
      { position: 440, time: 32 },
    ]);
  });

  it('does not capture velocities when freeMode is off', () => {
    const s = createGestureState();
    gestureStart(s, { x: 500, y: 50, time: 0 });
    gestureMove(s, { x: 470, y: 50, time: 16 }, baseEnv);
    expect(s.velocities).toEqual([]);
  });

  it('clears velocities on a new gestureStart', () => {
    const s = createGestureState();
    gestureStart(s, { x: 500, y: 50, time: 0 });
    gestureMove(s, { x: 470, y: 50, time: 16 }, freeEnv);
    gestureStart(s, { x: 300, y: 50, time: 100 });
    expect(s.velocities).toEqual([]);
  });
});

describe('gestureMove rtl', () => {
  const rtlEnv = {
    ...baseEnv,
    params: normalizeParams({ slidesPerView: 1, rtl: true, resistance: false, threshold: 0 }),
  };

  it('mirrors swipe direction: dragging right is "next" in rtl', () => {
    const s = createGestureState();
    gestureStart(s, { x: 100, y: 50, time: 0 });
    // drag right (+200). LTR this is "prev"; rtl flips it to "next".
    const r = gestureMove(s, { x: 300, y: 50, time: 16 }, rtlEnv);
    expect(s.swipeDirection).toBe('next');
    // diff flips to -200 → currentTranslate = -200 + startTranslate(0)
    expect(r?.translate).toBe(-200);
  });

  it('dragging left is "prev" in rtl', () => {
    const s = createGestureState();
    gestureStart(s, { x: 300, y: 50, time: 0 });
    const r = gestureMove(s, { x: 100, y: 50, time: 16 }, rtlEnv);
    expect(s.swipeDirection).toBe('prev');
    expect(r?.translate).toBe(200);
  });
});

describe('gestureMove vertical', () => {
  const vEnv = {
    ...baseEnv,
    params: normalizeParams({ slidesPerView: 1, direction: 'vertical', threshold: 0 }),
  };

  it('follows the finger up with the Y axis (vertical)', () => {
    const s = createGestureState();
    gestureStart(s, { x: 50, y: 300, time: 0 });
    const r = gestureMove(s, { x: 50, y: 100, time: 16 }, vEnv);
    expect(r?.translate).toBe(-200); // diffY = 100 - 300 = -200
    expect(s.swipeDirection).toBe('next');
    expect(s.isMoved).toBe(true);
  });

  it('treats X movement as scrolling when vertical', () => {
    const s = createGestureState();
    gestureStart(s, { x: 50, y: 300, time: 0 });
    // pure horizontal move (Y constant) → isScrolling true → returns null, gesture released
    const t = gestureMove(s, { x: 250, y: 300, time: 16 }, vEnv);
    expect(t).toBeNull();
    expect(s.isScrolling).toBe(true);
  });

  it('captures Y-axis velocity samples when vertical + freeMode', () => {
    const s = createGestureState();
    const env = {
      ...baseEnv,
      params: normalizeParams({
        slidesPerView: 1,
        direction: 'vertical',
        freeMode: true,
        threshold: 0,
      }),
    };
    gestureStart(s, { x: 50, y: 300, time: 0 });
    gestureMove(s, { x: 50, y: 270, time: 16 }, env);
    expect(s.velocities).toEqual([
      { position: 300, time: 0 }, // seed = startY
      { position: 270, time: 16 }, // currentY
    ]);
  });
});

describe('gestureMove vertical + rtl (rtl must not mirror the vertical axis)', () => {
  // Frozen rtlTranslate = (direction === 'horizontal' && rtl), so dir='rtl' on a
  // vertical slider is cosmetic only — the Y drag stays canonical (no diff flip).
  const vRtlEnv = {
    ...baseEnv,
    params: normalizeParams({ slidesPerView: 1, direction: 'vertical', rtl: true, threshold: 0 }),
  };

  it('follows the finger up like plain vertical — rtl does not flip diff', () => {
    const s = createGestureState();
    gestureStart(s, { x: 50, y: 300, time: 0 });
    const r = gestureMove(s, { x: 50, y: 100, time: 16 }, vRtlEnv);
    expect(r?.translate).toBe(-200); // diffY -200, NOT flipped to +200
    expect(s.swipeDirection).toBe('next');
  });
});

describe('gestureMove threshold (mechanism B re-anchor)', () => {
  const thEnv = { ...baseEnv, params: normalizeParams({ slidesPerView: 1, threshold: 5 }) };

  it('the first move past the threshold arms and HOLDS (no jump), re-anchoring the origin', () => {
    const s = createGestureState();
    gestureStart(s, { x: 300, y: 50, time: 0 });
    const r = gestureMove(s, { x: 280, y: 50, time: 16 }, thEnv); // 20px > 5 → arms
    expect(r?.translate).toBe(0); // held at startTranslate — no threshold jump
    expect(s.allowThresholdMove).toBe(true);
    expect(s.startX).toBe(280); // origin re-anchored to the current point
    expect(s.diff).toBe(0); // recomputed to 0 after the re-anchor
    expect(s.isMoved).toBe(true);
  });

  it('a second move then follows the finger 1:1 from the re-anchored origin', () => {
    const s = createGestureState();
    gestureStart(s, { x: 300, y: 50, time: 0 });
    gestureMove(s, { x: 280, y: 50, time: 16 }, thEnv); // arm (re-anchor at 280)
    const r = gestureMove(s, { x: 200, y: 50, time: 32 }, thEnv); // travel 80px from re-anchor
    expect(r?.translate).toBe(-80); // NOT -100 — the first 20px was absorbed by the arm
  });

  it('a sub-threshold move is a dead zone (no movement, not armed)', () => {
    const s = createGestureState();
    gestureStart(s, { x: 300, y: 50, time: 0 });
    const r = gestureMove(s, { x: 297, y: 50, time: 16 }, thEnv); // 3px < 5 (Euclidean)
    expect(r).toBeNull();
    expect(s.allowThresholdMove).toBe(false);
  });
});
