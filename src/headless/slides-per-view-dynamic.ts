/** Inputs `slidesPerViewDynamic` reads — the live grids plus the active index. */
export interface SpvDynamicCtx {
  slidesPerView: number | 'auto';
  centeredSlides: boolean;
  slidesGrid: number[];
  slidesSizesGrid: number[];
  containerSize: number;
  activeIndex: number;
}

/**
 * Port of `Surfer.prototype.slidesPerViewDynamic`
 * (`src/core/core.ts:381-426`): how many slides fit in the viewport starting from
 * the active slide, looking forward (`'current'`) or backward (`'previous'`). DOM
 * reads are removed — `slidesGrid` / `slidesSizesGrid` are passed in. With `exact`,
 * a slide counts only when its right edge is strictly inside the viewport; without
 * it, only its left edge must be. The `centeredSlides` branch counts outward from
 * the active slide (ignoring `view`); the virtual branch is out of scope.
 */
export function slidesPerViewDynamic(
  view: 'current' | 'previous',
  exact: boolean,
  ctx: SpvDynamicCtx,
): number {
  const { slidesPerView, centeredSlides, slidesGrid, slidesSizesGrid, containerSize, activeIndex } =
    ctx;
  if (typeof slidesPerView === 'number') return slidesPerView;

  let spv = 1;
  if (centeredSlides) {
    // Port of the centeredSlides branch of slidesPerViewDynamic (src/core/core.ts:387-403):
    // accumulate slide sizes outward from the active slide until they exceed the viewport.
    // The forward sum ceils each size and the backward sum does not — matching the oracle.
    let slideSize =
      slidesSizesGrid[activeIndex] !== undefined ? Math.ceil(slidesSizesGrid[activeIndex]) : 0;
    let breakLoop = false;
    for (let i = activeIndex + 1; i < slidesGrid.length; i += 1) {
      if (slidesSizesGrid[i] !== undefined && !breakLoop) {
        slideSize += Math.ceil(slidesSizesGrid[i]);
        spv += 1;
        if (slideSize > containerSize) breakLoop = true;
      }
    }
    for (let i = activeIndex - 1; i >= 0; i -= 1) {
      if (slidesSizesGrid[i] !== undefined && !breakLoop) {
        slideSize += slidesSizesGrid[i];
        spv += 1;
        if (slideSize > containerSize) breakLoop = true;
      }
    }
    return spv;
  }

  if (view === 'current') {
    for (let i = activeIndex + 1; i < slidesGrid.length; i += 1) {
      const inView = exact
        ? slidesGrid[i] + slidesSizesGrid[i] - slidesGrid[activeIndex] < containerSize
        : slidesGrid[i] - slidesGrid[activeIndex] < containerSize;
      if (inView) spv += 1;
    }
  } else {
    for (let i = activeIndex - 1; i >= 0; i -= 1) {
      if (slidesGrid[activeIndex] - slidesGrid[i] < containerSize) spv += 1;
    }
  }
  return spv;
}
