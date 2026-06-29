import { describe, it, expect } from 'vitest';
import { freeModeRelease, type FreeModeInput } from '../../src/headless/free-mode';
import { normalizeParams } from '../../src/headless/params';

// 5 slides × 800px, spaceBetween 0, 800px viewport.
// slidesGrid/snapGrid = [0,800,1600,2400,3200]; minTranslate 0; maxTranslate -3200.
const base = (over: Partial<FreeModeInput>): FreeModeInput => ({
  velocities: [],
  endTime: 1000,
  touchStartTime: 900,
  translate: -800,
  minTranslate: 0,
  maxTranslate: -3200,
  snapGrid: [0, 800, 1600, 2400, 3200],
  slidesGrid: [0, 800, 1600, 2400, 3200],
  slidesSizesGrid: [800, 800, 800, 800, 800],
  slidesLength: 5,
  activeIndex: 1,
  swipeDirection: 'next',
  params: normalizeParams({ slidesPerView: 1, freeMode: true }),
  ...over,
});

// A leftward (next) flick: 30px in 10ms → velocity = -30/10/2 = -1.5 (× ratio 1).
const flick = [
  { position: 500, time: 990 },
  { position: 470, time: 1000 },
];

describe('freeModeRelease — overscroll clamps', () => {
  it('snaps back to activeIndex when dragged before the beginning', () => {
    // currentPos = -translate = -50 < -minTranslate(0) → slideTo(activeIndex)
    const r = freeModeRelease(base({ translate: 50, activeIndex: 0 }));
    expect(r).toEqual({ kind: 'slideTo', index: 0, speed: 300 });
  });

  it('snaps to the last slide when dragged past the end', () => {
    // currentPos = 3300 > -maxTranslate(3200) → slideTo(slidesLength - 1)
    const r = freeModeRelease(base({ translate: -3300, activeIndex: 4 }));
    expect(r).toEqual({ kind: 'slideTo', index: 4, speed: 300 });
  });
});

describe('freeModeRelease — momentum', () => {
  it('projects an in-bounds resting translate with a computed duration', () => {
    // translate -800, velocity -1.5 → newPosition = -800 + (-1.5 * 1000) = -2300
    const r = freeModeRelease(base({ translate: -800, velocities: flick }));
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') {
      expect(r.translate).toBeCloseTo(-2300, 6);
      // duration = |(-2300 - -800) / -1.5| = 1000
      expect(r.transitionDuration).toBeCloseTo(1000, 6);
    }
  });

  it('zeroes velocity below minimumVelocity → stays put with no transition', () => {
    // 0.2px in 10ms → 0.01 < 0.02 minimumVelocity → velocity 0 → newPosition = translate
    const tiny = [
      { position: 500, time: 990 },
      { position: 499.8, time: 1000 },
    ];
    const r = freeModeRelease(base({ translate: -800, velocities: tiny }));
    expect(r).toEqual({ kind: 'momentum', translate: -800, transitionDuration: 0 });
  });

  it('zeroes velocity when the gap before release is stale (>300ms)', () => {
    const stale = [
      { position: 500, time: 600 },
      { position: 470, time: 650 },
    ];
    // endTime 1000 - last.time 650 = 350 > 300 → velocity 0
    const r = freeModeRelease(base({ translate: -800, velocities: stale, endTime: 1000 }));
    expect(r).toEqual({ kind: 'momentum', translate: -800, transitionDuration: 0 });
  });

  it('clamps to maxTranslate when bounce is disabled and projection passes the end', () => {
    const r = freeModeRelease(
      base({
        translate: -2400,
        velocities: flick, // -1.5 → newPosition -3900, past -3200
        params: normalizeParams({
          slidesPerView: 1,
          freeMode: true,
          freeModeMomentumBounce: false,
        }),
      }),
    );
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBe(-3200);
  });
});

describe('freeModeRelease — bounce', () => {
  it('overshoots past the end then reports the settle target', () => {
    // translate -2400, velocity -1.5 → newPosition -3900 < maxTranslate(-3200).
    // bounceAmount = 1.5*20*1 = 30; -3900 + -3200 = -7100 < -30 → overshoot = -3200 - 30 = -3230.
    const r = freeModeRelease(base({ translate: -2400, velocities: flick }));
    expect(r.kind).toBe('bounce');
    if (r.kind === 'bounce') {
      expect(r.translate).toBe(-3230);
      expect(r.afterBouncePosition).toBe(-3200);
      expect(r.settleSpeed).toBe(300);
    }
  });
});

describe('freeModeRelease — sticky', () => {
  it('snaps to the nearest snap point (no forward direction bias)', () => {
    // small leftward velocity from translate -800; velocity -0.15 → newPosition -950.
    // nearest snap to 950 is 800. swipeDirection 'prev' so the 'next' forward-bias
    // (which would otherwise force the snap point ahead of the projection) is not applied.
    const small = [
      { position: 500, time: 990 },
      { position: 497, time: 1000 },
    ];
    const r = freeModeRelease(
      base({
        translate: -800,
        velocities: small,
        swipeDirection: 'prev',
        params: normalizeParams({ slidesPerView: 1, freeMode: true, freeModeSticky: true }),
      }),
    );
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBe(-800);
  });

  it("biases to the forward snap when swipeDirection is 'next'", () => {
    // Same projection (newPosition -950) but swipeDirection 'next' forces the snap
    // point ahead of the projection (1600 → -1600) regardless of which is nearer
    // (port of the `|| swipeDirection === 'next'` branch, free-mode.ts:136-144).
    const small = [
      { position: 500, time: 990 },
      { position: 497, time: 1000 },
    ];
    const r = freeModeRelease(
      base({
        translate: -800,
        velocities: small,
        swipeDirection: 'next',
        params: normalizeParams({ slidesPerView: 1, freeMode: true, freeModeSticky: true }),
      }),
    );
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBe(-1600);
  });

  it('slides to the closest snap when momentum velocity is zero', () => {
    // velocity 0, sticky → slideToClosest. translate -900 (past the -800 snap by 100,
    // less than half of 800) → stays on index 1.
    const r = freeModeRelease(
      base({
        translate: -900,
        activeIndex: 1,
        velocities: [],
        params: normalizeParams({ slidesPerView: 1, freeMode: true, freeModeSticky: true }),
      }),
    );
    expect(r).toEqual({ kind: 'slideTo', index: 1, speed: 300 });
  });
});

describe('freeModeRelease — momentum off', () => {
  it('returns static (stay put) when momentum and sticky are both off', () => {
    const r = freeModeRelease(
      base({
        translate: -850,
        velocities: flick,
        params: normalizeParams({ slidesPerView: 1, freeMode: true, freeModeMomentum: false }),
      }),
    );
    expect(r).toEqual({ kind: 'static' });
  });

  it('slides to closest when momentum is off but sticky is on', () => {
    const r = freeModeRelease(
      base({
        translate: -850,
        activeIndex: 1,
        velocities: flick,
        params: normalizeParams({
          slidesPerView: 1,
          freeMode: true,
          freeModeMomentum: false,
          freeModeSticky: true,
        }),
      }),
    );
    expect(r).toEqual({ kind: 'slideTo', index: 1, speed: 300 });
  });
});

describe('freeModeRelease — rtl', () => {
  // rtl flips the velocity so the canonical projection mirrors. From idx1 (canonical
  // -800), a leftward flick (clientX 500→470, v=-1.5) flips to +1.5 → newPosition +700,
  // past the beginning → clamped to minTranslate 0 (momentumBounce off). Matches frozen.
  const flickLeft = [
    { position: 500, time: 990 },
    { position: 470, time: 1000 },
  ];

  it('mirrors momentum so a left flick in rtl settles toward the beginning', () => {
    const r = freeModeRelease(
      base({
        translate: -800,
        velocities: flickLeft,
        params: normalizeParams({
          slidesPerView: 1,
          rtl: true,
          freeMode: true,
          freeModeMomentumBounce: false,
        }),
      }),
    );
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBe(0);
  });

  it('non-rtl: the same left flick carries forward (regression guard)', () => {
    const r = freeModeRelease(
      base({
        translate: -800,
        velocities: flickLeft,
        params: normalizeParams({
          slidesPerView: 1,
          freeMode: true,
          freeModeMomentumBounce: false,
        }),
      }),
    );
    // v=-1.5 → newPosition -800 + -1500 = -2300 (in bounds, no flip)
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBeCloseTo(-2300, 6);
  });

  it('vertical+rtl: rtl does NOT mirror momentum on the vertical axis', () => {
    // rtlTranslate is false when vertical, so the velocity must not flip — the flick
    // carries forward exactly like the non-rtl case (-2300), not clamped back like
    // horizontal rtl would. Guards against gating the flip on raw `rtl`.
    const r = freeModeRelease(
      base({
        translate: -800,
        velocities: flickLeft,
        params: normalizeParams({
          slidesPerView: 1,
          direction: 'vertical',
          rtl: true,
          freeMode: true,
          freeModeMomentumBounce: false,
        }),
      }),
    );
    expect(r.kind).toBe('momentum');
    if (r.kind === 'momentum') expect(r.translate).toBeCloseTo(-2300, 6);
  });
});
