import { describe, it, expect } from 'vitest';
import { closestSlideIndex } from '../../src/headless/slide-to-closest';

// snapGrid for 5 slides of 800, container 800: [0, 800, 1600, 2400, 3200].
const SNAP = [0, 800, 1600, 2400, 3200];
const GRID = [0, 800, 1600, 2400, 3200];

function idx(translate: number, activeIndex: number) {
  return closestSlideIndex({
    activeIndex,
    translate,
    snapGrid: SNAP,
    slidesGrid: GRID,
    slidesPerGroup: 1,
    slidesPerGroupSkip: 0,
  });
}

describe('closestSlideIndex', () => {
  it('stays on the current snap when within the lower half', () => {
    // translate -900 → t=900, between snap[1]=800 and snap[2]=1600, 900-800=100 < 800*0.5
    expect(idx(-900, 1)).toBe(1);
  });
  it('advances when past the half-way threshold to the next snap', () => {
    // t=1300, 1300-800=500 > 400 → advance to 2
    expect(idx(-1300, 1)).toBe(2);
  });
  it('snaps back when before the current snap and within the prev half', () => {
    // activeIndex 2 (snap 1600), t=1000 < 1600; 1000-800=200 <= (1600-800)*0.5=400 → go to 1
    expect(idx(-1000, 2)).toBe(1);
  });
  it('clamps to [0, slidesGrid.length - 1]', () => {
    expect(idx(0, 0)).toBe(0);
    expect(idx(-3200, 4)).toBe(4);
  });
  it('honors slidesPerGroup > 1', () => {
    // spg 2, snapGrid [0,1600,3200]; activeIndex 0, t=1700 past snap[1]? snapIndex=0,
    // t=1700 >= snap[0]=0, next=1600 → 1700-0=1700 > 1600*0.5=800 → index += 2 → 2
    const r = closestSlideIndex({
      activeIndex: 0,
      translate: -1700,
      snapGrid: [0, 1600, 3200],
      slidesGrid: [0, 800, 1600, 2400, 3200],
      slidesPerGroup: 2,
      slidesPerGroupSkip: 0,
    });
    expect(r).toBe(2);
  });
});
