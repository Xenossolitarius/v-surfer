import type { EngineParams } from './types';

/**
 * Frozen `loopFix`'s `loopedSlides` for the non-centered path (src/core/loop/loopFix.ts:67-75):
 * `slidesPerGroup` rounded up to a multiple of `slidesPerGroup` (a no-op here) plus
 * `loopAdditionalSlides`. Centered/offset (`bothDirections`) is out of scope for this slice.
 *
 * DIVERGENCE for `slidesPerView: 'auto'`: the base is `max(slidesPerGroup, ceil(slidesPerView))`
 * (`slidesPerView` here being the dynamic visible count) so the loop buffer covers the visible
 * slides. Frozen keeps `slidesPerGroup` and relies on the consumer to set `loopAdditionalSlides`;
 * without enough buffer the active slide cannot stay flush-left near the grid end and the loop
 * visibly clamps. `loopAdditionalSlides` still adds on top. Numeric `slidesPerView` is unchanged
 * — it keeps frozen parity (the numeric loop differential suite depends on it).
 */
export function loopedSlidesCount(params: EngineParams, slidesPerView: number): number {
  const slidesPerGroup = params.slidesPerGroup;
  let loopedSlides =
    params.slidesPerView === 'auto'
      ? Math.max(slidesPerGroup, Math.ceil(slidesPerView))
      : slidesPerGroup;
  if (loopedSlides % slidesPerGroup !== 0) {
    loopedSlides += slidesPerGroup - (loopedSlides % slidesPerGroup);
  }
  loopedSlides += params.loopAdditionalSlides;
  return loopedSlides;
}

/** Input to `computeLoopFix`. `order` is the current rotation of [0..N-1]. */
export interface LoopFixInput {
  order: number[];
  activeIndex: number;
  slidesGrid: number[];
  slidesPerView: number;
  params: EngineParams;
  direction: 'next' | 'prev';
  /** Override active position for the prepend/append calc (slideToLoop). Defaults to activeIndex. */
  activeSlideIndex?: number;
  /** When defined, reposition by node-count shift off the real activeIndex (slideToLoop 'next'). */
  slideRealIndex?: number;
}

/** The rotated order plus the speed-0 `slideTo` target that holds visual position. */
export interface LoopFixResult {
  order: number[];
  repositionIndex: number;
  /** Frozen grid diff (`slidesGrid[active ± shift] − slidesGrid[active]`); the drag path
   *  subtracts it from start/current translate. Prepend positive, append negative. 0 for the
   *  `slideRealIndex`-override path (drag never uses that path). Nav callers ignore it. */
  translateDelta: number;
}

/**
 * Port of the non-centered, non-grid, non-virtual core of `src/core/loop/loopFix.ts`.
 * Builds the prepend/append batch of `loopedSlides` real-slide positions, rotates the
 * order by moving those nodes to the front (prev) or back (next), and computes the
 * reposition `slideTo` index. Only the branch matching `direction` actually moves nodes
 * (mirrors the frozen `if (isPrev)` / `if (isNext)` guards) — so "next at index 0"
 * builds prepend indexes but returns null (the init no-op).
 */
export function computeLoopFix(input: LoopFixInput): LoopFixResult | null {
  const { order, params, direction, slidesPerView } = input;
  const cols = order.length;
  const loopedSlides = loopedSlidesCount(params, slidesPerView);
  const slidesPerGroup = params.slidesPerGroup;
  const activeIndexLocal = input.activeSlideIndex ?? input.activeIndex;
  const activeColIndexWithShift = activeIndexLocal; // bothDirections false → no shift

  const prependIdx: number[] = [];
  const appendIdx: number[] = [];
  let slidesPrepended = 0;
  let slidesAppended = 0;

  if (activeColIndexWithShift < loopedSlides) {
    slidesPrepended = Math.max(loopedSlides - activeColIndexWithShift, slidesPerGroup);
    for (let i = 0; i < loopedSlides - activeColIndexWithShift; i += 1) {
      const index = i - Math.floor(i / cols) * cols;
      prependIdx.push(cols - index - 1);
    }
  } else if (activeColIndexWithShift + slidesPerView > cols - loopedSlides) {
    slidesAppended = Math.max(activeColIndexWithShift - (cols - loopedSlides * 2), slidesPerGroup);
    for (let i = 0; i < slidesAppended; i += 1) {
      const index = i - Math.floor(i / cols) * cols;
      appendIdx.push(index);
    }
  }

  if (direction === 'prev' && prependIdx.length > 0) {
    const moved = prependIdx.map((i) => order[i]).reverse();
    const rest = order.filter((_, i) => !prependIdx.includes(i));
    const translateDelta =
      input.slideRealIndex === undefined
        ? input.slidesGrid[activeIndexLocal + slidesPrepended] - input.slidesGrid[activeIndexLocal]
        : 0;
    return {
      order: [...moved, ...rest],
      repositionIndex:
        input.slideRealIndex === undefined
          ? activeIndexLocal + Math.ceil(slidesPrepended)
          : input.activeIndex + prependIdx.length,
      translateDelta,
    };
  }
  if (direction === 'next' && appendIdx.length > 0) {
    const moved = appendIdx.map((i) => order[i]);
    const rest = order.filter((_, i) => !appendIdx.includes(i));
    const translateDelta =
      input.slideRealIndex === undefined
        ? input.slidesGrid[activeIndexLocal - slidesAppended] - input.slidesGrid[activeIndexLocal]
        : 0;
    return {
      order: [...rest, ...moved],
      repositionIndex:
        input.slideRealIndex === undefined
          ? activeIndexLocal - slidesAppended
          : input.activeIndex - appendIdx.length,
      translateDelta,
    };
  }
  return null;
}

/** Input to `slideToLoopTarget`. */
export interface SlideToLoopTargetInput {
  order: number[];
  activeIndex: number;
  slidesPerView: number;
  params: EngineParams;
}

/** Whether a real-index target needs a pre-fix and, if so, the loopFix args to use. */
export interface SlideToLoopTargetResult {
  targetPosition: number;
  needFix: boolean;
  direction: 'next' | 'prev';
  activeSlideIndex: number;
}

/**
 * Port of the non-centered/non-grid mapping in `src/core/slide/slideToLoop.ts`:
 * find the current position of `realIndex`, decide whether it is within `slidesPerView`
 * of the end (needs a fix), and which direction + `activeSlideIndex` override to pass to
 * `computeLoopFix`.
 */
export function slideToLoopTarget(
  realIndex: number,
  input: SlideToLoopTargetInput,
): SlideToLoopTargetResult {
  const { order, activeIndex, slidesPerView } = input;
  const cols = order.length;
  const targetPosition = order.indexOf(realIndex);
  const needFix = cols - targetPosition < slidesPerView;
  const direction: 'next' | 'prev' =
    targetPosition - activeIndex - 1 < slidesPerView ? 'next' : 'prev';
  const activeSlideIndex = direction === 'next' ? targetPosition + 1 : targetPosition - cols + 1;
  return { targetPosition, needFix, direction, activeSlideIndex };
}
