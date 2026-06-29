/** Inputs for one slide's derived flags. Lengths in px; indices are ordinals. */
export interface SlideFlagsInput {
  index: number;
  offset: number; // physical (layout) position — offsetsGrid[index], not the centered snap coord
  size: number; // slidesSizesGrid[index]
  translate: number; // current wrapper translate (≤ 0 in LTR)
  containerSize: number; // viewport size (the core's surfer.size)
  activeIndex: number;
}

/** Derived per-slide state. */
export interface SlideFlags {
  isActive: boolean;
  isPrev: boolean;
  isNext: boolean;
  isVisible: boolean;
  isFullyVisible: boolean;
}

/**
 * Port of the non-centered/non-loop/non-grid slice of
 * `src/core/update/updateSlidesProgress.ts` (visibility) and the simple-list
 * branch of `updateSlidesClasses.ts` (active/next/prev). No DOM: the slide's
 * offset and size are passed in rather than measured. The `-1` / `> 1` terms in
 * `isVisible` are the core's sub-pixel guards, preserved verbatim.
 */
export function computeSlideFlags(input: SlideFlagsInput): SlideFlags {
  const { index, offset, size, translate, containerSize, activeIndex } = input;

  const offsetCenter = -translate;
  const slideBefore = -(offsetCenter - offset);
  const slideAfter = slideBefore + size;

  const measured = containerSize > 0;
  const isFullyVisible = measured && slideBefore >= 0 && slideBefore <= containerSize - size;
  const isVisible =
    measured &&
    ((slideBefore >= 0 && slideBefore < containerSize - 1) ||
      (slideAfter > 1 && slideAfter <= containerSize) ||
      (slideBefore <= 0 && slideAfter >= containerSize));

  return {
    isActive: index === activeIndex,
    isPrev: index === activeIndex - 1,
    isNext: index === activeIndex + 1,
    isVisible,
    isFullyVisible,
  };
}
