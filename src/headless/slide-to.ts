import type { EngineParams } from './types';

export interface SlideCtx {
  params: EngineParams;
  snapGrid: number[];
  slidesGrid: number[];
}

export interface SlideTarget {
  slideIndex: number;
  translate: number;
}

/**
 * Port of the index→translate resolution in `src/core/slide/slideTo.ts`
 * (no loop, no cssMode, no direction-locks). Returns the snap translate and
 * the normalized slide index.
 */
export function resolveSlideTo(index: number, ctx: SlideCtx): SlideTarget {
  const { params, snapGrid, slidesGrid } = ctx;
  let slideIndex = index;
  if (slideIndex < 0) slideIndex = 0;

  const skip = Math.min(params.slidesPerGroupSkip, slideIndex);
  let snapIndex = skip + Math.floor((slideIndex - skip) / params.slidesPerGroup);
  if (snapIndex >= snapGrid.length) snapIndex = snapGrid.length - 1;
  const translate = snapGrid[snapIndex] === 0 ? 0 : -snapGrid[snapIndex];

  if (params.normalizeSlideIndex) {
    for (let i = 0; i < slidesGrid.length; i += 1) {
      const normalizedTranslate = -Math.floor(translate * 100);
      const normalizedGrid = Math.floor(slidesGrid[i] * 100);
      const normalizedGridNext = Math.floor(slidesGrid[i + 1] * 100);
      if (typeof slidesGrid[i + 1] !== 'undefined') {
        if (
          normalizedTranslate >= normalizedGrid &&
          normalizedTranslate < normalizedGridNext - (normalizedGridNext - normalizedGrid) / 2
        ) {
          slideIndex = i;
        } else if (
          normalizedTranslate >= normalizedGrid &&
          normalizedTranslate < normalizedGridNext
        ) {
          slideIndex = i + 1;
        }
      } else if (normalizedTranslate >= normalizedGrid) {
        slideIndex = i;
      }
    }
  }
  return { slideIndex, translate };
}

/**
 * Port of the prev-snap resolution in `src/core/slide/slidePrev.ts`
 * (no loop, no freeMode, no rewind). `translate` is the signed
 * wrapper translate (≤ 0 in LTR). Returns the target slide index.
 *
 * Note: The slidesPerGroupAuto page adjustment lives in the engine's slidePrev
 * (next to slideNext's), mirroring the frozen core's structure.
 */
export function resolveSlidePrev(translate: number, ctx: SlideCtx): number {
  const { params, snapGrid, slidesGrid } = ctx;
  const t = -translate;
  const normalize = (val: number) => (val < 0 ? -Math.floor(Math.abs(val)) : Math.floor(val));
  const normalizedTranslate = normalize(t);
  const normalizedSnapGrid = snapGrid.map(normalize);
  let prevSnap = snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate) - 1];
  // cssMode fallback: when there's no exact prev snap, scan for the largest snap
  // at/below the current position and step one back (frozen slidePrev.ts:40-53,
  // non-freeMode branch — headless freeMode release is handled separately).
  if (typeof prevSnap === 'undefined' && params.cssMode) {
    let prevSnapIndex: number | undefined;
    snapGrid.forEach((snap, snapIndex) => {
      if (normalizedTranslate >= snap) prevSnapIndex = snapIndex;
    });
    if (typeof prevSnapIndex !== 'undefined') {
      prevSnap = snapGrid[prevSnapIndex > 0 ? prevSnapIndex - 1 : prevSnapIndex];
    }
  }
  let prevIndex = 0;
  if (typeof prevSnap !== 'undefined') {
    prevIndex = slidesGrid.indexOf(prevSnap);
    if (prevIndex < 0) prevIndex = 0;
  }
  return prevIndex;
}
