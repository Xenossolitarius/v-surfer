import { describe, it, expect } from 'vitest';
import { autoHeightTargetIndices } from '../../src/headless/auto-height';
import type { EngineState } from '../../src/headless/types';

// Minimal state factory: the helper only reads slidesPerView, centeredSlides,
// activeIndex, and slides[].isVisible, so a partial cast is sufficient and keeps
// the cases fully deterministic.
function mkState(opts: {
  slidesPerView: number | 'auto';
  centeredSlides?: boolean;
  activeIndex: number;
  count: number;
  visible?: number[];
}): EngineState<unknown> {
  const { slidesPerView, centeredSlides = false, activeIndex, count, visible = [] } = opts;
  const slides = Array.from({ length: count }, (_, i) => ({ isVisible: visible.includes(i) }));
  return {
    activeIndex,
    slides,
    layout: { slidesPerView, centeredSlides },
  } as unknown as EngineState<unknown>;
}

describe('autoHeightTargetIndices', () => {
  it('slidesPerView 1 → the active slide only', () => {
    expect(
      autoHeightTargetIndices(mkState({ slidesPerView: 1, activeIndex: 2, count: 5 })),
    ).toEqual([2]);
  });

  it("slidesPerView 'auto' → the active slide only (even with several visible)", () => {
    expect(
      autoHeightTargetIndices(
        mkState({ slidesPerView: 'auto', activeIndex: 1, count: 5, visible: [1, 2, 3] }),
      ),
    ).toEqual([1]);
  });

  it('slidesPerView 3 non-centered, active 0 → the active index range [0,1,2]', () => {
    expect(
      autoHeightTargetIndices(mkState({ slidesPerView: 3, activeIndex: 0, count: 5 })),
    ).toEqual([0, 1, 2]);
  });

  it('slidesPerView 3 non-centered near the end → range clamped to the slide count', () => {
    expect(
      autoHeightTargetIndices(mkState({ slidesPerView: 3, activeIndex: 3, count: 5 })),
    ).toEqual([3, 4]);
  });

  it('slidesPerView 3 centered → the visible positions (not the index range)', () => {
    expect(
      autoHeightTargetIndices(
        mkState({
          slidesPerView: 3,
          centeredSlides: true,
          activeIndex: 2,
          count: 5,
          visible: [1, 2, 3],
        }),
      ),
    ).toEqual([1, 2, 3]);
  });
});
