/**
 * Port of `src/core/slide/slideToClosest.ts` (no DOM, no callbacks). Given the
 * current active index and signed translate, returns the slide index of the
 * closest snap using the frozen threshold rule (default 0.5). `translate` is the
 * signed internal value (≤ 0 in LTR); `t = -translate` is the positive position,
 * matching the frozen core's non-RTL branch (the headless engine keeps a single
 * signed-LTR internal convention regardless of `rtl`).
 */
export interface ClosestSlideInput {
  activeIndex: number;
  translate: number;
  snapGrid: number[];
  slidesGrid: number[];
  slidesPerGroup: number;
  slidesPerGroupSkip: number;
  threshold?: number;
}

export function closestSlideIndex(input: ClosestSlideInput): number {
  const { activeIndex, translate, snapGrid, slidesGrid, slidesPerGroup, slidesPerGroupSkip } =
    input;
  const threshold = input.threshold ?? 0.5;
  let index = activeIndex;
  const skip = Math.min(slidesPerGroupSkip, index);
  const snapIndex = skip + Math.floor((index - skip) / slidesPerGroup);
  const t = -translate;

  if (t >= snapGrid[snapIndex]) {
    // On or after the current snap → choose between current and next.
    const currentSnap = snapGrid[snapIndex];
    const nextSnap = snapGrid[snapIndex + 1];
    // `nextSnap === undefined` guard is equivalent to the frozen NaN-comparison
    // (translate - undefined = NaN, and `NaN > x` is false → no advance).
    if (nextSnap !== undefined && t - currentSnap > (nextSnap - currentSnap) * threshold) {
      index += slidesPerGroup;
    }
  } else {
    // Before the current snap → choose between current and previous.
    const prevSnap = snapGrid[snapIndex - 1];
    const currentSnap = snapGrid[snapIndex];
    if (prevSnap !== undefined && t - prevSnap <= (currentSnap - prevSnap) * threshold) {
      index -= slidesPerGroup;
    }
  }
  index = Math.max(index, 0);
  index = Math.min(index, slidesGrid.length - 1);
  return index;
}
