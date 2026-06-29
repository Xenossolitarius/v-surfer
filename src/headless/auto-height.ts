import type { EngineState } from './types';

/**
 * The layout-position indices whose slides drive the auto-height measurement,
 * faithful to frozen `src/core/update/updateAutoHeight.ts:23-37`:
 *   - slidesPerView a number > 1:
 *       centered → every in-view position (frozen's `visibleSlides`);
 *       else     → activeIndex .. activeIndex + ceil(slidesPerView) - 1, clamped.
 *   - slidesPerView 1 or 'auto' → the active slide only.
 *
 * Returned indices are layout positions, parallel to `state.slides` and the
 * kit's `host.slideEls` (so the caller maps index → slideEls[index]).
 */
export function autoHeightTargetIndices(state: EngineState<unknown>): number[] {
  const spv = state.layout.slidesPerView;
  const { activeIndex } = state;
  if (typeof spv === 'number' && spv > 1) {
    if (state.layout.centeredSlides) {
      return state.slides.flatMap((s, i) => (s.isVisible ? [i] : []));
    }
    const out: number[] = [];
    for (let i = 0; i < Math.ceil(spv); i += 1) {
      const idx = activeIndex + i;
      if (idx >= state.slides.length) break; // skip indices past the slide count
      out.push(idx);
    }
    return out;
  }
  return [activeIndex];
}
