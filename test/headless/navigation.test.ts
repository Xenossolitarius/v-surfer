import { describe, it, expect } from 'vitest';
import {
  navigationModel,
  navigationPrevClasses,
  navigationNextClasses,
} from '../../src/headless/navigation';
import type { EngineState } from '../../src/headless/types';

/** Minimal EngineState stub — navigationModel only reads snapGrid/isBeginning/isEnd. */
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
    slidesGrid: [0],
    snapGrid: [0, 800, 1600],
    slides: [],
    ...over,
  };
}

describe('navigationModel', () => {
  it('disables prev at the beginning and next at the end (no rewind)', () => {
    expect(
      navigationModel(st({ isBeginning: true }), { loop: false, rewind: false }),
    ).toMatchObject({
      prevDisabled: true,
      nextDisabled: false,
    });
    expect(navigationModel(st({ isEnd: true }), { loop: false, rewind: false })).toMatchObject({
      prevDisabled: false,
      nextDisabled: true,
    });
  });

  it('never disables under rewind (port of navigation.ts:75-76 — isBeginning && !rewind)', () => {
    const m = navigationModel(st({ isBeginning: true, isEnd: true }), {
      loop: false,
      rewind: true,
    });
    expect(m.prevDisabled).toBe(false);
    expect(m.nextDisabled).toBe(false);
  });

  it('never disables under loop (port of navigation.ts:69-72 — loop → both enabled)', () => {
    const m = navigationModel(st({ isBeginning: true, isEnd: true }), {
      loop: true,
      rewind: false,
    });
    expect(m.prevDisabled).toBe(false);
    expect(m.nextDisabled).toBe(false);
  });

  it('reports locked when there is a single snap', () => {
    expect(navigationModel(st({ snapGrid: [0] }), { loop: false, rewind: false }).locked).toBe(
      true,
    );
    expect(navigationModel(st({ snapGrid: [0, 800] }), { loop: false, rewind: false }).locked).toBe(
      false,
    );
  });
});

describe('navigation class names', () => {
  it('base classes; disabled + lock toggle', () => {
    expect(
      navigationPrevClasses({ prevDisabled: false, nextDisabled: false, locked: false }),
    ).toEqual(['v-surfer-button-prev']);
    expect(
      navigationPrevClasses({ prevDisabled: true, nextDisabled: false, locked: false }),
    ).toEqual(['v-surfer-button-prev', 'v-surfer-button-disabled']);
    expect(
      navigationNextClasses({ prevDisabled: false, nextDisabled: true, locked: true }),
    ).toEqual(['v-surfer-button-next', 'v-surfer-button-disabled', 'v-surfer-button-lock']);
  });
});
