import { describe, it, expect } from 'vitest';
import { computeGeometry } from '../../src/headless/slides-geometry';
import { normalizeParams } from '../../src/headless/params';
import { createEngine } from '../../src/headless/engine';
import type { EngineParamsInput } from '../../src/headless/types';

const P = (o: EngineParamsInput = {}) => normalizeParams(o);

describe('computeGeometry — centeredSlidesBounds', () => {
  // 5 slides @ slidesPerView 3 in a 300 container (size 100 each, no gaps).
  // Centered baseline snaps: [-100, 0, 100, 200, 300]; maxSnap = 500 - 300 = 200.
  it('clamps centered snaps into [0, maxSnap] (no leading/trailing gap)', () => {
    const base = computeGeometry(5, 300, P({ slidesPerView: 3, centeredSlides: true }));
    expect(base.snapGrid).toEqual([-100, 0, 100, 200, 300]); // sanity: baseline

    const bounded = computeGeometry(
      5,
      300,
      P({ slidesPerView: 3, centeredSlides: true, centeredSlidesBounds: true }),
    );
    expect(bounded.snapGrid).toEqual([0, 0, 100, 200, 200]);
  });

  it('is a no-op without centeredSlides', () => {
    const base = computeGeometry(5, 300, P({ slidesPerView: 3 }));
    const bounded = computeGeometry(5, 300, P({ slidesPerView: 3, centeredSlidesBounds: true }));
    expect(bounded.snapGrid).toEqual(base.snapGrid);
    expect(bounded.slidesGrid).toEqual(base.slidesGrid);
  });
});

describe('computeGeometry — centerInsufficientSlides', () => {
  // 2 slides @ slidesPerView 3 in a 300 container (size 100 each) → total 200 < 300.
  // off = (300 - 200) / 2 = 50. Non-centered baseline: snapGrid [0], slidesGrid [0, 100].
  it('centers an under-full set (snaps -off, slides +off)', () => {
    const base = computeGeometry(2, 300, P({ slidesPerView: 3 }));
    expect(base.snapGrid).toEqual([0]); // sanity
    expect(base.slidesGrid).toEqual([0, 100]);

    const centered = computeGeometry(
      2,
      300,
      P({ slidesPerView: 3, centerInsufficientSlides: true }),
    );
    expect(centered.snapGrid).toEqual([-50]);
    expect(centered.slidesGrid).toEqual([50, 150]);
  });

  it('is a no-op when the slides fill the container', () => {
    const base = computeGeometry(5, 300, P({ slidesPerView: 3 }));
    const centered = computeGeometry(
      5,
      300,
      P({ slidesPerView: 3, centerInsufficientSlides: true }),
    );
    expect(centered.snapGrid).toEqual(base.snapGrid);
    expect(centered.slidesGrid).toEqual(base.slidesGrid);
  });
});

describe('computeGeometry — centering edge cases', () => {
  // slidesPerView 'auto', sizes [100,100], spaceBetween 20, container 400.
  // allSlidesSize = 100+100 + (2-1)*20 = 220 < 400 → off = (400-220)/2 = 90.
  // Locks the allSlidesSize definition (Σsize + (n-1)*spaceBetween) for the 'auto' path.
  it("centerInsufficientSlides with 'auto' sizes and spaceBetween > 0", () => {
    const base = computeGeometry(
      2,
      400,
      P({ slidesPerView: 'auto', spaceBetween: 20 }),
      [100, 100],
    );
    expect(base.snapGrid).toEqual([0]);
    expect(base.slidesGrid).toEqual([0, 120]);

    const centered = computeGeometry(
      2,
      400,
      P({ slidesPerView: 'auto', spaceBetween: 20, centerInsufficientSlides: true }),
      [100, 100],
    );
    expect(centered.snapGrid).toEqual([-90]);
    expect(centered.slidesGrid).toEqual([90, 210]);
  });

  // Both params enabled together (centered, total 200 < container 400). Faithful to
  // frozen's sequential application: bounds runs first (maxSnap = 0 since total < size,
  // collapsing every snap to 0), then insufficient subtracts off = (400-200)/2 = 100.
  // Centered baseline snaps [-150,-50], slidesGrid [-150,-50].
  it('centeredSlidesBounds + centerInsufficientSlides compose (bounds then insufficient)', () => {
    const both = computeGeometry(
      2,
      400,
      P({
        slidesPerView: 'auto',
        centeredSlides: true,
        centeredSlidesBounds: true,
        centerInsufficientSlides: true,
      }),
      [100, 100],
    );
    expect(both.snapGrid).toEqual([-100, -100]);
    expect(both.slidesGrid).toEqual([-50, 50]);
  });
});

describe('engine integration: params flow to snapGrid', () => {
  it('centerInsufficientSlides shifts the engine snapGrid end-to-end', () => {
    const engine = createEngine<{ n: number }>({
      slidesPerView: 3,
      centerInsufficientSlides: true,
    });
    engine.setGeometry({ containerSize: 300 });
    engine.setSlides([{ data: { n: 0 } }, { data: { n: 1 } }]);
    expect(engine.state.snapGrid).toEqual([-50]);
  });
});
