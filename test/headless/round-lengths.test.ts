import { describe, it, expect } from 'vitest';
import { computeGeometry } from '../../src/headless/slides-geometry';
import { normalizeParams } from '../../src/headless/params';
import type { EngineParamsInput } from '../../src/headless/types';

const P = (o: EngineParamsInput = {}) => normalizeParams(o);

describe('computeGeometry — roundLengths', () => {
  // container 100, slidesPerView 3, spaceBetween 0 → uniform size 33.333…
  it('floors slide sizes and grid positions to integers when on', () => {
    const g = computeGeometry(5, 100, P({ slidesPerView: 3, roundLengths: true }));
    expect(g.slidesSizesGrid).toEqual([33, 33, 33, 33, 33]);
    expect(g.slidesGrid).toEqual([0, 33, 66, 99, 132]);
    expect(g.snapGrid.every((v) => Number.isInteger(v))).toBe(true);
  });

  it('keeps fractional sizes when off (default)', () => {
    const g = computeGeometry(5, 100, P({ slidesPerView: 3 }));
    expect(g.slidesSizesGrid[0]).toBeCloseTo(33.333, 2);
  });

  it('floors the running accumulator so fractional spaceBetween does not drift', () => {
    // container 100, slidesPerView 3, spaceBetween 0.5 → uniform size floor(99/3)=33.
    // Frozen floors slidePosition in place each step: 0, 33, 66, 99, 132 (not 0,33,67,100,134).
    const g = computeGeometry(
      5,
      100,
      P({ slidesPerView: 3, spaceBetween: 0.5, roundLengths: true }),
    );
    expect(g.slidesGrid).toEqual([0, 33, 66, 99, 132]);
  });
});
