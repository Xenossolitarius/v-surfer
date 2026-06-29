import { describe, it, expect } from 'vitest';
import { autoplayAdvance, remainingTimeLeft } from '../../src/headless/autoplay';

const fwd = { reverseDirection: false, stopOnLastSlide: false, loop: false, rewind: false };
const mid = { isBeginning: false, isEnd: false, slidesLength: 5 };
const start = { isBeginning: true, isEnd: false, slidesLength: 5 };
const end = { isBeginning: false, isEnd: true, slidesLength: 5 };

describe('autoplayAdvance', () => {
  it('forward in the middle → next', () => {
    expect(autoplayAdvance(fwd, mid)).toEqual({ kind: 'next' });
  });
  it('forward at the end, no loop, wrap allowed → slideTo(0)', () => {
    expect(autoplayAdvance(fwd, end)).toEqual({ kind: 'slideTo', index: 0 });
  });
  it('forward at the end, stopOnLastSlide → none', () => {
    expect(autoplayAdvance({ ...fwd, stopOnLastSlide: true }, end)).toEqual({ kind: 'none' });
  });
  it('forward at the end with loop → next (loop keeps advancing)', () => {
    expect(autoplayAdvance({ ...fwd, loop: true }, end)).toEqual({ kind: 'next' });
  });
  it('forward at the end with rewind → next', () => {
    expect(autoplayAdvance({ ...fwd, rewind: true }, end)).toEqual({ kind: 'next' });
  });
  it('reverse in the middle → prev', () => {
    expect(autoplayAdvance({ ...fwd, reverseDirection: true }, mid)).toEqual({ kind: 'prev' });
  });
  it('reverse at the beginning, wrap allowed → slideTo(last)', () => {
    expect(autoplayAdvance({ ...fwd, reverseDirection: true }, start)).toEqual({
      kind: 'slideTo',
      index: 4,
    });
  });
  it('reverse at the beginning, stopOnLastSlide → none', () => {
    expect(
      autoplayAdvance({ ...fwd, reverseDirection: true, stopOnLastSlide: true }, start),
    ).toEqual({ kind: 'none' });
  });
  it('reverse at the beginning with loop → prev', () => {
    expect(autoplayAdvance({ ...fwd, reverseDirection: true, loop: true }, start)).toEqual({
      kind: 'prev',
    });
  });
});

describe('remainingTimeLeft', () => {
  it('returns startTime + delay - now, floored at 0', () => {
    expect(remainingTimeLeft(1000, 3000, 1000)).toBe(3000);
    expect(remainingTimeLeft(1000, 3000, 2200)).toBe(1800);
    expect(remainingTimeLeft(1000, 3000, 9000)).toBe(0);
  });
});
