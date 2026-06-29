import type { EngineParams } from './types';
import { axisCoord, rtlTranslate } from './direction';
import { computeLoopFix } from './loop';

/** Mutable per-drag state, mirroring the slice of `surfer.touchEventsData`/`touches` Slice 1 needs. */
export interface GestureState {
  isTouched: boolean;
  isMoved: boolean;
  startMoving: boolean | undefined;
  isScrolling: boolean | undefined;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  previousX: number;
  previousY: number;
  startTranslate: number;
  currentTranslate: number;
  touchStartTime: number;
  diff: number;
  swipeDirection: 'prev' | 'next' | undefined;
  touchesDirection: 'prev' | 'next' | undefined;
  loopSwapReset: boolean;
  allowThresholdMove: boolean;
  velocities: { position: number; time: number }[];
}

/** What a move produces: the live translate, plus (loop) a rotated order and a reversal hold. */
export interface GestureMoveResult {
  translate: number;
  order?: number[];
  hold?: boolean;
}

/** Read-only environment the gesture functions consult (geometry + current committed translate). */
export interface GestureEnv {
  params: EngineParams;
  translate: number; // current committed wrapper translate (≤ 0 in LTR)
  minTranslate: number;
  maxTranslate: number;
  slidesGrid: number[];
  slidesSizesGrid: number[];
  activeIndex: number;
  loopOrder: number[];
  slidesLength: number;
  isBeginning: boolean;
  isEnd: boolean;
}

export function createGestureState(): GestureState {
  return {
    isTouched: false,
    isMoved: false,
    startMoving: undefined,
    isScrolling: undefined,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    previousX: 0,
    previousY: 0,
    startTranslate: 0,
    currentTranslate: 0,
    touchStartTime: 0,
    diff: 0,
    swipeDirection: undefined,
    touchesDirection: undefined,
    loopSwapReset: false,
    allowThresholdMove: false,
    velocities: [],
  };
}

/** Port of the essential state-setup of `onTouchStart` (no DOM/edge/focus handling). */
export function gestureStart(
  state: GestureState,
  sample: { x: number; y: number; time: number },
): void {
  state.isTouched = true;
  state.isMoved = false;
  state.isScrolling = undefined;
  state.startMoving = undefined;
  state.swipeDirection = undefined;
  state.touchesDirection = undefined;
  state.loopSwapReset = false;
  state.allowThresholdMove = false;
  state.startX = sample.x;
  state.startY = sample.y;
  state.currentX = sample.x;
  state.currentY = sample.y;
  state.previousX = sample.x;
  state.previousY = sample.y;
  state.touchStartTime = sample.time;
  state.velocities.length = 0;
}

/** ceil of an integer slidesPerView; 1 for 'auto' (auto-loop is out of scope). Mirrors engine.loopSlidesPerView(). */
function slidesPerViewInt(params: EngineParams): number {
  return typeof params.slidesPerView === 'number' ? Math.ceil(params.slidesPerView) : 1;
}

/**
 * Port of the primary-axis drag math of `src/core/events/onTouchMove.ts` (the
 * drag axis follows `params.direction` — X for horizontal, Y for vertical — and
 * RTL mirrors the diff on the horizontal axis, see the `rtlTranslate` guard
 * below). No cssMode, no threshold-defer, no direction-locks.
 * Returns a `GestureMoveResult` (live translate to commit, plus optional rotated
 * `order` for loop wraps and optional `hold` flag), or `null` if the move should
 * not yet move the slider (scroll-detected, or not started moving).
 */
export function gestureMove(
  state: GestureState,
  sample: { x: number; y: number; time: number },
  env: GestureEnv,
): GestureMoveResult | null {
  const { params } = env;
  if (!state.isTouched || !params.allowTouchMove) return null;

  state.previousX = state.currentX;
  state.previousY = state.currentY;
  state.currentX = sample.x;
  state.currentY = sample.y;

  // touchReleaseOnEdges (port of onTouchMove.ts:74-98): at an edge, a further-off-edge drag
  // releases so the page can scroll. Non-loop only. NOTE: frozen restricts this to touch events;
  // the DOM-free engine can't see the event source, so it applies to any drag. Works best with
  // threshold:0 (frozen's caveat), which this pre-threshold placement reproduces.
  if (params.touchReleaseOnEdges && !params.loop) {
    const vertical = params.direction === 'vertical';
    const rtl = rtlTranslate(params.rtl, params.direction);
    if (vertical) {
      if (
        (state.currentY < state.startY && env.translate <= env.maxTranslate) ||
        (state.currentY > state.startY && env.translate >= env.minTranslate)
      ) {
        state.isTouched = false;
        state.isMoved = false;
        return null;
      }
    } else if (
      rtl &&
      ((state.currentX > state.startX && -env.translate <= env.maxTranslate) ||
        (state.currentX < state.startX && -env.translate >= env.minTranslate))
    ) {
      return null;
    } else if (
      !rtl &&
      ((state.currentX < state.startX && env.translate <= env.maxTranslate) ||
        (state.currentX > state.startX && env.translate >= env.minTranslate))
    ) {
      return null;
    }
  }

  if (params.freeMode) {
    if (state.velocities.length === 0) {
      state.velocities.push({
        position: axisCoord({ x: state.startX, y: state.startY }, params.direction),
        time: state.touchStartTime,
      });
    }
    state.velocities.push({
      position: axisCoord({ x: state.currentX, y: state.currentY }, params.direction),
      time: sample.time,
    });
  }

  const diffX = state.currentX - state.startX;
  const diffY = state.currentY - state.startY;
  if (params.threshold && Math.sqrt(diffX ** 2 + diffY ** 2) < params.threshold) return null;

  // Scroll vs swipe detection — the "opposite" axis (Y for horizontal, X for vertical)
  // staying put means a pure primary-axis drag; otherwise compare the touch angle.
  const horizontal = params.direction !== 'vertical';
  if (typeof state.isScrolling === 'undefined') {
    if (
      (horizontal && state.currentY === state.startY) ||
      (!horizontal && state.currentX === state.startX)
    ) {
      state.isScrolling = false;
    } else if (diffX * diffX + diffY * diffY >= 25) {
      const touchAngle = (Math.atan2(Math.abs(diffY), Math.abs(diffX)) * 180) / Math.PI;
      state.isScrolling = horizontal
        ? touchAngle > params.touchAngle
        : 90 - touchAngle > params.touchAngle;
    }
  }
  if (typeof state.startMoving === 'undefined') {
    if (state.currentX !== state.startX || state.currentY !== state.startY) {
      state.startMoving = true;
    }
  }
  if (state.isScrolling) {
    state.isTouched = false;
    return null;
  }
  if (!state.startMoving) return null;

  let diff = axisCoord({ x: diffX, y: diffY }, params.direction);
  let touchesDiff = axisCoord(
    { x: state.currentX - state.previousX, y: state.currentY - state.previousY },
    params.direction,
  );
  // oneWayMovement (port of onTouchMove.ts:177-180): collapse the drag to a single
  // forward direction regardless of pointer direction. Applied before state.diff is
  // captured and before the touchRatio multiply / rtl flip, exactly as the oracle does.
  if (params.oneWayMovement) {
    const rtl = rtlTranslate(params.rtl, params.direction);
    diff = Math.abs(diff) * (rtl ? 1 : -1);
    touchesDiff = Math.abs(touchesDiff) * (rtl ? 1 : -1);
  }
  state.diff = diff;
  diff *= params.touchRatio;
  if (rtlTranslate(params.rtl, params.direction)) {
    diff = -diff;
    touchesDiff = -touchesDiff;
  }

  const previousTouchesDirection = state.touchesDirection; // capture BEFORE this move overwrites it
  state.swipeDirection = diff > 0 ? 'prev' : 'next';
  state.touchesDirection = touchesDiff > 0 ? 'prev' : 'next';

  const firstMove = !state.isMoved; // capture BEFORE setting isMoved (headless sets it earlier than frozen)
  let order: number[] | undefined;

  // Port of onTouchMove.ts:193-196 — only run the first-move loopFix when the drag
  // travels toward an enabled direction (a locked direction never wraps).
  const allowLoopFix =
    (state.touchesDirection === 'next' && params.allowSlideNext) ||
    (state.touchesDirection === 'prev' && params.allowSlidePrev);

  if (firstMove) {
    state.startTranslate = env.translate;
    if (params.loop && allowLoopFix) {
      const fix = computeLoopFix({
        order: env.loopOrder,
        activeIndex: env.activeIndex,
        slidesGrid: env.slidesGrid,
        slidesPerView: slidesPerViewInt(params),
        params,
        direction: state.swipeDirection,
      });
      if (fix) {
        order = fix.order;
        state.startTranslate -= fix.translateDelta; // drag origin = repositioned translate
      }
    }
  }
  // Mid-drag direction flip: rebase the origin so the drag continues from here, and flag a
  // reset so onTouchEnd still snaps even if the gesture nets to zero. Frozen onTouchMove:223-243.
  if (
    !firstMove &&
    params.loop &&
    state.allowThresholdMove &&
    previousTouchesDirection !== state.touchesDirection &&
    Math.abs(diff) >= 1
  ) {
    state.startX = state.currentX;
    state.startY = state.currentY;
    state.startTranslate = state.currentTranslate;
    state.loopSwapReset = true;
    return order
      ? { translate: state.currentTranslate, hold: true, order }
      : { translate: state.currentTranslate, hold: true };
  }

  state.isMoved = true;
  state.currentTranslate = diff + state.startTranslate;

  // touchReleaseOnEdges also forces resistanceRatio to 0 (port of onTouchMove.ts:249-252):
  // past an edge it pins to the bound rather than rubber-banding.
  const resistanceRatio = params.touchReleaseOnEdges ? 0 : params.resistanceRatio;
  // NOTE: the cached env (activeIndex/slidesGrid/min/maxTranslate captured at move entry) is safe
  // here ONLY because uniform fixed-size slides make the grids rotation-invariant and the
  // edge-cross fires at most once per move — the future centered/'auto' slice must revisit this.
  if (diff > 0) {
    if (params.loop && state.allowThresholdMove && state.currentTranslate > env.minTranslate) {
      const fix = computeLoopFix({
        order: order ?? env.loopOrder,
        activeIndex: env.activeIndex,
        slidesGrid: env.slidesGrid,
        slidesPerView: slidesPerViewInt(params),
        params,
        direction: 'prev',
        activeSlideIndex: 0,
      });
      if (fix) {
        order = fix.order;
        state.startTranslate -= fix.translateDelta;
        state.currentTranslate -= fix.translateDelta;
      }
    }
    if (state.currentTranslate > env.minTranslate && params.resistance) {
      state.currentTranslate =
        env.minTranslate - 1 + (-env.minTranslate + state.startTranslate + diff) ** resistanceRatio;
    }
  } else if (diff < 0) {
    if (params.loop && state.allowThresholdMove && state.currentTranslate < env.maxTranslate) {
      const fix = computeLoopFix({
        order: order ?? env.loopOrder,
        activeIndex: env.activeIndex,
        slidesGrid: env.slidesGrid,
        slidesPerView: slidesPerViewInt(params),
        params,
        direction: 'next',
        activeSlideIndex: env.slidesLength - slidesPerViewInt(params),
      });
      if (fix) {
        order = fix.order;
        state.startTranslate -= fix.translateDelta;
        state.currentTranslate -= fix.translateDelta;
      }
    }
    if (state.currentTranslate < env.maxTranslate && params.resistance) {
      state.currentTranslate =
        env.maxTranslate + 1 - (env.maxTranslate - state.startTranslate - diff) ** resistanceRatio;
    }
  }

  // Direction locks (port of onTouchMove.ts:324-341): pin the drag back to its origin
  // when the gesture pushes toward a disabled direction, so the slider cannot move that
  // way. With both disabled the slider is frozen in place for the whole drag.
  if (
    !params.allowSlideNext &&
    state.swipeDirection === 'next' &&
    state.currentTranslate < state.startTranslate
  ) {
    state.currentTranslate = state.startTranslate;
  }
  if (
    !params.allowSlidePrev &&
    state.swipeDirection === 'prev' &&
    state.currentTranslate > state.startTranslate
  ) {
    state.currentTranslate = state.startTranslate;
  }
  if (!params.allowSlidePrev && !params.allowSlideNext) {
    state.currentTranslate = state.startTranslate;
  }

  // Threshold (port of onTouchMove.ts:343-360): the first frame the axis diff crosses
  // `threshold` arms the drag — re-anchor the origin to the current point and hold, so the
  // slide never jumps by the threshold amount. Subsequent frames follow the finger 1:1.
  // While still un-armed and below the axis threshold, hold position. Carries `order` so a
  // first-move loopFix rotation is still applied while position holds.
  if (params.threshold > 0) {
    if (Math.abs(diff) > params.threshold || state.allowThresholdMove) {
      if (!state.allowThresholdMove) {
        state.allowThresholdMove = true;
        state.startX = state.currentX;
        state.startY = state.currentY;
        state.currentTranslate = state.startTranslate;
        // startX/Y were just re-anchored to currentX/Y above ⇒ this evaluates to 0; it is
        // load-bearing: it resets state.diff so an arm-only release no-ops via gestureEnd's
        // `diff === 0` guard (mirrors the oracle's touches.diff recompute, onTouchMove.ts:351-353).
        state.diff = axisCoord(
          { x: state.currentX - state.startX, y: state.currentY - state.startY },
          params.direction,
        );
        return order
          ? { translate: state.currentTranslate, order }
          : { translate: state.currentTranslate };
      }
    } else {
      state.currentTranslate = state.startTranslate;
      return order
        ? { translate: state.currentTranslate, order }
        : { translate: state.currentTranslate };
    }
  }

  if (!params.followFinger) return null;
  return order
    ? { translate: state.currentTranslate, order }
    : { translate: state.currentTranslate };
}

/**
 * Port of the release-snap of `src/core/events/onTouchEnd.ts` (no freeMode, no
 * cssMode, no nav-button targets). Honors `params.rewind` at the edges. Returns
 * the target slide index to snap to, or `null` if there was no real move.
 */
export function gestureEnd(state: GestureState, env: GestureEnv, endTime: number): number | null {
  const { params, slidesGrid, slidesSizesGrid } = env;
  const timeDiff = endTime - state.touchStartTime;
  const moved = state.isMoved;

  state.isTouched = false;
  state.isMoved = false;
  state.startMoving = false;

  if (
    !moved ||
    !state.swipeDirection ||
    (state.diff === 0 && !state.loopSwapReset) ||
    (state.currentTranslate === state.startTranslate && !state.loopSwapReset)
  ) {
    return null;
  }

  const currentPos = -env.translate; // followFinger; canonical-internal translate keeps -translate ≥ 0 in all modes (incl. RTL)
  const swipeToLast = currentPos >= -env.maxTranslate && !params.loop;

  let stopIndex = 0;
  let groupSize = slidesSizesGrid[0];
  for (
    let i = 0;
    i < slidesGrid.length;
    i += i < params.slidesPerGroupSkip ? 1 : params.slidesPerGroup
  ) {
    const increment = i < params.slidesPerGroupSkip - 1 ? 1 : params.slidesPerGroup;
    if (typeof slidesGrid[i + increment] !== 'undefined') {
      if (swipeToLast || (currentPos >= slidesGrid[i] && currentPos < slidesGrid[i + increment])) {
        stopIndex = i;
        groupSize = slidesGrid[i + increment] - slidesGrid[i];
      }
    } else if (swipeToLast || currentPos >= slidesGrid[i]) {
      stopIndex = i;
      groupSize = slidesGrid[slidesGrid.length - 1] - slidesGrid[slidesGrid.length - 2];
    }
  }

  const ratio = (currentPos - slidesGrid[stopIndex]) / groupSize;
  const increment = stopIndex < params.slidesPerGroupSkip - 1 ? 1 : params.slidesPerGroup;

  // Rewind (port of onTouchEnd.ts:146-205): at an edge with rewind on, snap to the
  // opposite end. rewindFirstIndex (0) is set only when at the end; rewindLastIndex
  // (last) only when at the beginning — so both stay null off-edge and every branch
  // falls through to its existing target, leaving non-rewind behavior unchanged.
  const lastIndex = env.slidesLength - 1;
  let rewindFirstIndex: number | null = null;
  let rewindLastIndex: number | null = null;
  if (params.rewind) {
    if (env.isBeginning) rewindLastIndex = lastIndex;
    else if (env.isEnd) rewindFirstIndex = 0;
  }

  if (timeDiff > params.longSwipesMs) {
    if (!params.longSwipes) return env.activeIndex;
    if (state.swipeDirection === 'next') {
      if (ratio >= params.longSwipesRatio) {
        // mirrors frozen onTouchEnd.ts:173 — under this guard rewindFirstIndex is 0, never null
        return (params.rewind && env.isEnd ? rewindFirstIndex : stopIndex + increment) as number;
      }
      return stopIndex;
    }
    // prev
    if (ratio > 1 - params.longSwipesRatio) return stopIndex + increment;
    if (rewindLastIndex !== null && ratio < 0 && Math.abs(ratio) > params.longSwipesRatio) {
      return rewindLastIndex;
    }
    return stopIndex;
  }
  if (!params.shortSwipes) return env.activeIndex;
  if (state.swipeDirection === 'next') {
    return rewindFirstIndex !== null ? rewindFirstIndex : stopIndex + increment;
  }
  return rewindLastIndex !== null ? rewindLastIndex : stopIndex;
}
