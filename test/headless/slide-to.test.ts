import { describe, it, expect } from 'vitest';
import { resolveSlideTo, resolveSlidePrev } from '../../src/headless/slide-to';
import { normalizeParams } from '../../src/headless/params';

const snapGrid = [0, 800, 1600, 2400, 3200];
const slidesGrid = [0, 800, 1600, 2400, 3200];
const params = normalizeParams({ slidesPerView: 1 });
const ctx = { params, snapGrid, slidesGrid };

describe('resolveSlideTo', () => {
  it('resolves a middle index', () => {
    expect(resolveSlideTo(2, ctx)).toEqual({ slideIndex: 2, translate: -1600 });
  });
  it('clamps negative to 0', () => {
    expect(resolveSlideTo(-3, ctx)).toEqual({ slideIndex: 0, translate: 0 });
  });
  it('clamps overflow to the last snap', () => {
    expect(resolveSlideTo(99, ctx)).toEqual({ slideIndex: 4, translate: -3200 });
  });
});

describe('resolveSlidePrev', () => {
  it('steps back one snap from the current translate', () => {
    expect(resolveSlidePrev(-1600, ctx)).toBe(1);
  });
  it('stays at 0 at the beginning', () => {
    expect(resolveSlidePrev(0, ctx)).toBe(0);
  });
});
