import { describe, it, expect } from 'vitest';
import { virtualWindow } from '../../src/headless/virtual';

// A uniform horizontal grid: slidesLength slides, each `size` px, no gap.
const grid = (n: number, size: number) => Array.from({ length: n }, (_, i) => i * size);

const base = {
  slidesPerView: 1,
  slidesPerGroup: 1,
  centeredSlides: false,
  loop: false,
  addSlidesBefore: 0,
  addSlidesAfter: 0,
};

describe('virtualWindow', () => {
  it('spv:1 — window is [active-1 .. active+1], clamped at the ends', () => {
    const slidesGrid = grid(10, 800);
    const at = (activeIndex: number) =>
      virtualWindow({ ...base, activeIndex, slidesGrid, slidesLength: 10 });
    expect(at(0)).toEqual({ from: 0, to: 1, offset: 0 });
    expect(at(1)).toEqual({ from: 0, to: 2, offset: 0 });
    expect(at(3)).toEqual({ from: 2, to: 4, offset: 1600 });
    expect(at(5)).toEqual({ from: 4, to: 6, offset: 3200 });
    expect(at(9)).toEqual({ from: 8, to: 9, offset: 6400 });
  });

  it('spv:2 spg:2 — wider window, slidesBefore = slidesPerGroup', () => {
    const slidesGrid = grid(10, 400); // spv:2 → each slide 400px of an 800 container
    const at = (activeIndex: number) =>
      virtualWindow({
        ...base,
        activeIndex,
        slidesGrid,
        slidesLength: 10,
        slidesPerView: 2,
        slidesPerGroup: 2,
      });
    expect(at(0)).toEqual({ from: 0, to: 3, offset: 0 });
    expect(at(2)).toEqual({ from: 0, to: 5, offset: 0 });
    expect(at(4)).toEqual({ from: 2, to: 7, offset: 800 });
    expect(at(8)).toEqual({ from: 6, to: 9, offset: 2400 });
  });

  it('addSlidesBefore/After widen the window symmetrically', () => {
    const slidesGrid = grid(10, 800);
    expect(
      virtualWindow({
        ...base,
        activeIndex: 5,
        slidesGrid,
        slidesLength: 10,
        addSlidesBefore: 1,
        addSlidesAfter: 1,
      }),
    ).toEqual({ from: 3, to: 7, offset: 2400 });
  });

  it('centeredSlides — slidesBefore and slidesAfter use floor(spv/2)+spg formula', () => {
    // centeredSlides, spv:1, spg:1 → slidesBefore = 0+1+0 = 1, slidesAfter = 0+1+0 = 1
    const slidesGrid = grid(10, 800);
    const at = (activeIndex: number) =>
      virtualWindow({
        ...base,
        activeIndex,
        slidesGrid,
        slidesLength: 10,
        centeredSlides: true,
      });
    // active:0 → from = max(0-1,0) = 0, to = min(0+1,9) = 1, offset = grid[0]-grid[0] = 0
    expect(at(0)).toEqual({ from: 0, to: 1, offset: 0 });
    // active:5 → from = max(5-1,0) = 4, to = min(5+1,9) = 6, offset = grid[4]-grid[0] = 3200
    expect(at(5)).toEqual({ from: 4, to: 6, offset: 3200 });
    // active:9 → from = max(9-1,0) = 8, to = min(9+1,9) = 9, offset = grid[8]-grid[0] = 6400
    expect(at(9)).toEqual({ from: 8, to: 9, offset: 6400 });
  });

  it('loop — slidesBefore uses slidesPerView and window is not end-clamped', () => {
    const slidesGrid = grid(10, 800);
    // loop, spv:2 → slidesBefore = spv = 2, slidesAfter = spv+(spg-1) = 2.
    // activeIndex 5 >= slidesBefore → from -= slidesBefore branch.
    const w = virtualWindow({
      ...base,
      activeIndex: 5,
      slidesGrid,
      slidesLength: 10,
      slidesPerView: 2,
      loop: true,
    });
    // from = (5-2) - 2 = 1 ; to = 5+2 = 7 ; offset = slidesGrid[3] - slidesGrid[0] = 2400, +slidesGrid[0]=0
    expect(w).toEqual({ from: 1, to: 7, offset: 2400 });
  });
});
