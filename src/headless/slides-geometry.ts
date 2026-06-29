import type { EngineParams } from './types';

export interface Geometry {
  slidesSizesGrid: number[];
  slidesGrid: number[];
  snapGrid: number[];
  offsetsGrid: number[];
  virtualSize: number;
}

/**
 * Port of the simple-case branch of `src/core/update/updateSlides.ts`:
 * non-centered, non-virtual, non-grid, no offsets, `roundLengths:false`. All DOM
 * reads/writes removed. For integer `slidesPerView` the slide size is computed
 * from the container; for `'auto'` each slide uses its measured size, pushed in
 * via `sizes`. When `centeredSlides` is set, the grid uses the centered recurrence
 * and the snap grid is left untrimmed; `offsetsGrid` always holds the plain
 * physical positions.
 */
export function computeGeometry(
  count: number,
  containerSize: number,
  params: EngineParams,
  sizes?: number[],
): Geometry {
  const {
    slidesPerView,
    spaceBetween,
    slidesPerGroup,
    slidesPerGroupSkip,
    centeredSlides,
    centerInsufficientSlides,
    centeredSlidesBounds,
  } = params;
  const surferSize = containerSize;
  // roundLengths (port of updateSlides.ts roundLengths floors): integer slide sizes
  // and grid positions to avoid sub-pixel blur.
  const round = (v: number): number => (params.roundLengths ? Math.floor(v) : v);
  // Integer slidesPerView → uniform computed size. 'auto' → each slide uses its
  // measured size (pushed in via `sizes`).
  const uniformSize =
    slidesPerView === 'auto'
      ? 0
      : (surferSize - (slidesPerView - 1) * spaceBetween) / slidesPerView;

  const slidesSizesGrid: number[] = [];
  let slidesGrid: number[] = [];
  const offsetsGrid: number[] = [];
  let snapGrid: number[] = [];
  // snap/grid coordinate: the centered recurrence when centered, else the plain
  // cumulative position. `physicalPosition` is always the plain cumulative offset.
  let slidePosition = 0;
  let physicalPosition = 0;
  let prevSlideSize = 0;
  let virtualSize = -spaceBetween;

  for (let i = 0; i < count; i += 1) {
    const slideSize = round(slidesPerView === 'auto' ? (sizes?.[i] ?? 0) : uniformSize);
    slidesSizesGrid.push(slideSize);
    offsetsGrid.push(physicalPosition);

    if (centeredSlides) {
      // Port of the centered branch of src/core/update/updateSlides.ts:192-200.
      slidePosition = slidePosition + slideSize / 2 + prevSlideSize / 2 + spaceBetween;
      if (prevSlideSize === 0 && i !== 0)
        slidePosition = slidePosition - surferSize / 2 - spaceBetween;
      if (i === 0) slidePosition = slidePosition - surferSize / 2 - spaceBetween;
      if (Math.abs(slidePosition) < 1 / 1000) slidePosition = 0;
      slidePosition = round(slidePosition);
      if (i % slidesPerGroup === 0) snapGrid.push(slidePosition);
      slidesGrid.push(slidePosition);
    } else {
      slidePosition = round(slidePosition);
      if ((i - Math.min(slidesPerGroupSkip, i)) % slidesPerGroup === 0) {
        snapGrid.push(slidePosition);
      }
      slidesGrid.push(slidePosition);
      slidePosition += slideSize + spaceBetween;
    }

    prevSlideSize = slideSize;
    physicalPosition += slideSize + spaceBetween;
    virtualSize += slideSize + spaceBetween;
  }
  const allSlidesSize = virtualSize; // total content size before the >= container clamp
  virtualSize = Math.max(virtualSize, surferSize);

  // Trim snaps to the scrollable range + edge snap — the core skips this for centered
  // (centeredSlides keeps every slide as a snap; updateSlides.ts:235).
  if (!centeredSlides) {
    const newSnapGrid: number[] = [];
    for (let i = 0; i < snapGrid.length; i += 1) {
      if (snapGrid[i] <= virtualSize - surferSize) newSnapGrid.push(snapGrid[i]);
    }
    snapGrid = newSnapGrid;
    if (Math.floor(virtualSize - surferSize) - Math.floor(snapGrid[snapGrid.length - 1]) > 1) {
      snapGrid.push(virtualSize - surferSize);
    }
  }
  if (snapGrid.length === 0) snapGrid = [0];

  // centeredSlidesBounds (frozen updateSlides.ts:332-344): clamp snaps so centered edge
  // slides sit flush — no leading/trailing gap. offsetBefore/After are 0 in the kit (no
  // slidesOffset* params), so each snap clamps into [0, maxSnap]. Only meaningful with
  // centeredSlides (the non-centered snapGrid is already edge-bounded by the trim above).
  if (centeredSlides && centeredSlidesBounds) {
    const maxSnap = allSlidesSize > surferSize ? allSlidesSize - surferSize : 0;
    snapGrid = snapGrid.map((snap) => (snap <= 0 ? 0 : snap > maxSnap ? maxSnap : snap));
  }

  // centerInsufficientSlides (frozen updateSlides.ts:346-361): when the slides don't fill
  // the container, center the whole set — shift snaps back and slides forward.
  if (centerInsufficientSlides && allSlidesSize < surferSize) {
    const allSlidesOffset = (surferSize - allSlidesSize) / 2;
    snapGrid = snapGrid.map((snap) => snap - allSlidesOffset);
    slidesGrid = slidesGrid.map((pos) => pos + allSlidesOffset);
  }

  return { slidesSizesGrid, slidesGrid, snapGrid, offsetsGrid, virtualSize };
}
