import { describe, it, expect } from 'vitest';
import { minTranslate, maxTranslate } from '../../src/headless/translate';
import { computeProgress, activeIndexByTranslate } from '../../src/headless/active-index';
import { normalizeParams } from '../../src/headless/params';

const snapGrid = [0, 800, 1600, 2400, 3200];
const slidesGrid = [0, 800, 1600, 2400, 3200];
const params = normalizeParams({ slidesPerView: 1 });

describe('translate bounds', () => {
  it('min/max from snapGrid', () => {
    expect(minTranslate(snapGrid)).toBe(0);
    expect(maxTranslate(snapGrid)).toBe(-3200);
  });
});

describe('computeProgress', () => {
  it('beginning', () => {
    expect(computeProgress(0, snapGrid)).toEqual({ progress: 0, isBeginning: true, isEnd: false });
  });
  it('end', () => {
    expect(computeProgress(-3200, snapGrid)).toEqual({
      progress: 1,
      isBeginning: false,
      isEnd: true,
    });
  });
  it('middle', () => {
    expect(computeProgress(-1600, snapGrid)).toEqual({
      progress: 0.5,
      isBeginning: false,
      isEnd: false,
    });
  });
  it('single snap → both edges, progress 0', () => {
    expect(computeProgress(0, [0])).toEqual({ progress: 0, isBeginning: true, isEnd: true });
  });
});

describe('activeIndexByTranslate', () => {
  it('maps translate to the nearest leading slide', () => {
    expect(activeIndexByTranslate(0, slidesGrid, params)).toBe(0);
    expect(activeIndexByTranslate(-1600, slidesGrid, params)).toBe(2);
    expect(activeIndexByTranslate(-3200, slidesGrid, params)).toBe(4);
  });
});
