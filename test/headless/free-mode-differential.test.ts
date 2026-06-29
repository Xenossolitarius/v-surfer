import { describe, it, expect, afterAll } from 'vitest';
import {
  freeModeRelease,
  type FreeModeInput,
  type VelocitySample,
} from '../../src/headless/free-mode';
import { normalizeParams } from '../../src/headless/params';
import { activeIndexByTranslate } from '../../src/headless/active-index';
import { golden } from '../golden/golden';

const g = golden('free-mode');
afterAll(() => g.save());

// Frozen Surfer params (nested freeMode object) ←→ flat headless params.
interface FrozenFreeOpts {
  momentum?: boolean;
  momentumBounce?: boolean;
  sticky?: boolean;
}

const flatParams = (free: FrozenFreeOpts, direction?: 'horizontal' | 'vertical') =>
  normalizeParams({
    slidesPerView: 1,
    spaceBetween: 0,
    freeMode: true,
    freeModeMomentum: free.momentum ?? true,
    freeModeMomentumBounce: free.momentumBounce ?? true,
    freeModeSticky: free.sticky ?? false,
    ...(direction ? { direction } : {}),
  });

// Run one release against golden fixtures and assert port output.
function assertReleaseParity(
  opts: {
    count: number;
    free: FrozenFreeOpts;
    direction?: 'horizontal' | 'vertical';
    startIndex: number;
    releaseTranslate: number;
    samples: VelocitySample[]; // positions only; times stamped clock-relative below
    swipeDirection: 'prev' | 'next';
  },
  keyPrefix: string,
) {
  const { count, free, direction, startIndex, releaseTranslate, samples, swipeDirection } = opts;

  // Stamp sample times near the current clock so the `now()-stale>300` guard
  // and the `time>150` guard don't fire (free-mode.ts:84).
  const nowMs = Date.now();
  const t0 = nowMs - 20;
  const velocities = samples.map((s, i) => ({ position: s.position, time: t0 + i * 10 }));

  const input: FreeModeInput = {
    velocities,
    endTime: Date.now(),
    touchStartTime: t0,
    translate: releaseTranslate,
    minTranslate: g.expected(`${keyPrefix}:minTranslate`) as number,
    maxTranslate: g.expected(`${keyPrefix}:maxTranslate`) as number,
    snapGrid: g.expected(`${keyPrefix}:snapGrid`) as number[],
    slidesGrid: g.expected(`${keyPrefix}:slidesGrid`) as number[],
    slidesSizesGrid: g.expected(`${keyPrefix}:slidesSizesGrid`) as number[],
    slidesLength: count,
    activeIndex: startIndex,
    swipeDirection,
    params: flatParams(free, direction),
  };
  const r = freeModeRelease(input);

  let portTranslate: number;
  if (r.kind === 'slideTo') {
    // slideTo maps an index back to its snap translate (LTR: -snapGrid[index]).
    portTranslate = -input.snapGrid[Math.min(r.index, input.snapGrid.length - 1)];
  } else if (r.kind === 'static') {
    portTranslate = releaseTranslate;
  } else {
    portTranslate = r.translate; // momentum / bounce (overshoot)
  }
  const portActive = activeIndexByTranslate(portTranslate, input.slidesGrid, input.params);

  expect(portTranslate).toBeCloseTo(g.expected(`${keyPrefix}:oracleTranslate`) as number, 0);
  expect(portActive).toBe(g.expected(`${keyPrefix}:oracleActive`));
}

describe('freeMode differential vs frozen onTouchEnd', () => {
  it('in-bounds momentum (next flick)', () => {
    assertReleaseParity(
      {
        count: 8,
        free: { momentum: true, momentumBounce: false },
        startIndex: 1,
        releaseTranslate: -800,
        samples: [
          { position: 500, time: 0 },
          { position: 470, time: 0 },
        ],
        swipeDirection: 'next',
      },
      'ltr-next-flick',
    );
  });

  it('in-bounds momentum (prev flick)', () => {
    assertReleaseParity(
      {
        count: 8,
        free: { momentum: true, momentumBounce: false },
        startIndex: 4,
        releaseTranslate: -3200,
        samples: [
          { position: 470, time: 0 },
          { position: 500, time: 0 },
        ],
        swipeDirection: 'prev',
      },
      'ltr-prev-flick',
    );
  });

  it('clamps to the end with bounce disabled', () => {
    assertReleaseParity(
      {
        count: 5,
        free: { momentum: true, momentumBounce: false },
        startIndex: 3,
        releaseTranslate: -2400,
        samples: [
          { position: 500, time: 0 },
          { position: 440, time: 0 },
        ],
        swipeDirection: 'next',
      },
      'ltr-clamp-end',
    );
  });

  it('overscroll clamp: released past the end', () => {
    assertReleaseParity(
      {
        count: 5,
        free: { momentum: true },
        startIndex: 4,
        releaseTranslate: -3300,
        samples: [
          { position: 500, time: 0 },
          { position: 480, time: 0 },
        ],
        swipeDirection: 'next',
      },
      'ltr-overscroll',
    );
  });

  it('sticky with zero velocity → closest snap', () => {
    assertReleaseParity(
      {
        count: 6,
        free: { momentum: true, sticky: true },
        startIndex: 2,
        releaseTranslate: -1700,
        samples: [], // no samples → velocity 0 → slideToClosest
        swipeDirection: 'next',
      },
      'ltr-sticky-zero',
    );
  });

  it('momentum off, sticky on → closest snap', () => {
    assertReleaseParity(
      {
        count: 6,
        free: { momentum: false, sticky: true },
        startIndex: 2,
        releaseTranslate: -1700,
        samples: [
          { position: 500, time: 0 },
          { position: 480, time: 0 },
        ],
        swipeDirection: 'next',
      },
      'ltr-momentum-off-sticky',
    );
  });

  it('vertical in-bounds momentum matches the frozen onTouchEnd', () => {
    assertReleaseParity(
      {
        count: 8,
        free: { momentum: true, momentumBounce: false },
        direction: 'vertical',
        startIndex: 1,
        releaseTranslate: -400, // one 400px slide in
        samples: [
          { position: 300, time: 0 },
          { position: 270, time: 0 },
        ], // Y positions
        swipeDirection: 'next',
      },
      'vert-next-flick',
    );
  });
});

describe('freeMode rtl differential vs frozen onTouchEnd', () => {
  function assertRtlRelease(
    startIndex: number,
    samples: VelocitySample[],
    swipeDirection: 'prev' | 'next',
    keyPrefix: string,
  ) {
    const nowMs = Date.now();
    const t0 = nowMs - 20;
    const velocities = samples.map((s, i) => ({ position: s.position, time: t0 + i * 10 }));

    const input: FreeModeInput = {
      velocities,
      endTime: Date.now(),
      touchStartTime: t0,
      translate: g.expected(`${keyPrefix}:canonicalTranslate`) as number,
      minTranslate: g.expected(`${keyPrefix}:minTranslate`) as number,
      maxTranslate: g.expected(`${keyPrefix}:maxTranslate`) as number,
      snapGrid: g.expected(`${keyPrefix}:snapGrid`) as number[],
      slidesGrid: g.expected(`${keyPrefix}:slidesGrid`) as number[],
      slidesSizesGrid: g.expected(`${keyPrefix}:slidesSizesGrid`) as number[],
      slidesLength: 8,
      activeIndex: startIndex,
      swipeDirection,
      params: normalizeParams({
        slidesPerView: 1,
        spaceBetween: 0,
        rtl: true,
        freeMode: true,
        freeModeMomentum: true,
        freeModeMomentumBounce: false,
      }),
    };
    // Guard: ensure the engine params actually carry RTL mode.
    // Mirrors the original frozen `expect(surfer.rtlTranslate).toBe(true)` check.
    expect(input.params.rtl).toBe(true);

    const r = freeModeRelease(input);
    let portCanonical: number;
    if (r.kind === 'slideTo')
      portCanonical = -input.snapGrid[Math.min(r.index, input.snapGrid.length - 1)];
    else if (r.kind === 'static') portCanonical = input.translate;
    else portCanonical = r.translate;
    const portExposed = -portCanonical; // re-expose to the rtl convention
    expect(portExposed).toBeCloseTo(g.expected(`${keyPrefix}:oracleTranslate`) as number, 0);
  }

  it('left flick from idx1 settles toward the beginning', () => {
    assertRtlRelease(
      1,
      [
        { position: 500, time: 0 },
        { position: 470, time: 0 },
      ],
      'next',
      'rtl-left-flick',
    );
  });
  it('right flick from idx3 carries toward the end', () => {
    assertRtlRelease(
      3,
      [
        { position: 470, time: 0 },
        { position: 500, time: 0 },
      ],
      'prev',
      'rtl-right-flick',
    );
  });
});
