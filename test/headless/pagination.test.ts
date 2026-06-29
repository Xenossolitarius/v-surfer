import { describe, it, expect } from 'vitest';
import {
  paginationModel,
  snapIndexFromTranslate,
  paginationContainerClasses,
  paginationBulletClasses,
} from '../../src/headless/pagination';
import type { EngineState } from '../../src/headless/types';

function st(over: Partial<EngineState<unknown>>): EngineState<unknown> {
  return {
    translate: 0,
    transitionDuration: 0,
    activeIndex: 0,
    realIndex: 0,
    progress: 0,
    isBeginning: false,
    isEnd: false,
    touching: false,
    slidesSizesGrid: [],
    slidesGrid: [0, 800, 1600, 2400, 3200],
    snapGrid: [0, 800, 1600, 2400, 3200],
    slides: Array.from({ length: 5 }, (_, i) => ({
      data: i,
      index: i,
      realIndex: i,
      size: 800,
      offset: i * 800,
      progress: 0,
      isActive: i === 0,
      isPrev: false,
      isNext: false,
      isVisible: false,
      isFullyVisible: false,
    })),
    ...over,
  };
}

describe('snapIndexFromTranslate', () => {
  it('returns the snapGrid index nearest -translate', () => {
    const grid = [0, 800, 1600, 2400, 3200];
    expect(snapIndexFromTranslate(0, grid)).toBe(0);
    expect(snapIndexFromTranslate(-1600, grid)).toBe(2);
    expect(snapIndexFromTranslate(-3200, grid)).toBe(4);
    expect(snapIndexFromTranslate(-1500, grid)).toBe(2); // nearest
  });
});

describe('paginationModel (non-loop)', () => {
  it('total = snapGrid length; current = snapIndex; one bullet per snap', () => {
    const m = paginationModel(st({ translate: -1600 }), {
      type: 'bullets',
      loop: false,
      slidesPerGroup: 1,
      slidesLength: 5,
    });
    expect(m.total).toBe(5);
    expect(m.current).toBe(2);
    expect(m.bullets).toEqual([0, 1, 2, 3, 4]);
    expect(m.fraction).toEqual({ current: 3, total: 5 });
    expect(m.progress).toBeCloseTo(3 / 5, 6);
    expect(m.locked).toBe(false);
  });

  it('uses snapIndex (grouped snaps) when slidesPerGroup > 1', () => {
    // 5 slides, spg 2 → snaps at slides 0,2,4 → snapGrid [0,1600,3200]
    const m = paginationModel(st({ snapGrid: [0, 1600, 3200], translate: -1600 }), {
      type: 'bullets',
      loop: false,
      slidesPerGroup: 2,
      slidesLength: 5,
    });
    expect(m.total).toBe(3);
    expect(m.current).toBe(1);
  });

  it('reports locked for a single snap', () => {
    const m = paginationModel(st({ snapGrid: [0] }), {
      type: 'fraction',
      loop: false,
      slidesPerGroup: 1,
      slidesLength: 5,
    });
    expect(m.locked).toBe(true);
  });
});

describe('paginationModel (loop)', () => {
  it('total = ceil(slidesLength / slidesPerGroup); current = floor(realIndex / spg)', () => {
    const m = paginationModel(st({ realIndex: 3 }), {
      type: 'bullets',
      loop: true,
      slidesPerGroup: 1,
      slidesLength: 6,
    });
    expect(m.total).toBe(6);
    expect(m.current).toBe(3);
  });

  it('groups under loop with slidesPerGroup > 1', () => {
    const m = paginationModel(st({ realIndex: 5 }), {
      type: 'bullets',
      loop: true,
      slidesPerGroup: 2,
      slidesLength: 6,
    });
    expect(m.total).toBe(3); // ceil(6/2)
    expect(m.current).toBe(2); // floor(5/2)
  });
});

describe('pagination class names', () => {
  it('container: base + type + lock', () => {
    expect(
      paginationContainerClasses({
        type: 'bullets',
        total: 3,
        current: 0,
        bullets: [0, 1, 2],
        fraction: { current: 1, total: 3 },
        progress: 0.33,
        locked: false,
      }),
    ).toEqual(['v-surfer-pagination', 'v-surfer-pagination-bullets']);
    expect(
      paginationContainerClasses({
        type: 'fraction',
        total: 1,
        current: 0,
        bullets: [0],
        fraction: { current: 1, total: 1 },
        progress: 1,
        locked: true,
      }),
    ).toEqual(['v-surfer-pagination', 'v-surfer-pagination-fraction', 'v-surfer-pagination-lock']);
  });

  it('bullet: active only at current index', () => {
    expect(paginationBulletClasses(2, 2)).toEqual([
      'v-surfer-pagination-bullet',
      'v-surfer-pagination-bullet-active',
    ]);
    expect(paginationBulletClasses(1, 2)).toEqual(['v-surfer-pagination-bullet']);
  });
});
