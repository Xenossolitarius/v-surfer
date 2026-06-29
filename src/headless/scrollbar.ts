import type { EngineState } from './types';

/** `centered` mirrors `centeredSlides`; `rtl` mirrors the direction. */
export interface ScrollbarParams {
  centered: boolean;
  rtl: boolean;
  /** When true, drive the thumb from the continuous `progressLoop` (frozen parity). */
  loop?: boolean;
}

/** Physical thumb geometry along the track, plus visibility flags. */
export interface ScrollbarModel {
  /** divider >= 1 — everything fits; the frozen module sets the track `display:none`. */
  hidden: boolean;
  /** snapGrid.length <= 1 — only one reachable position (the lock class applies). */
  locked: boolean;
  /** Physical thumb length in px. */
  size: number;
  /** Physical thumb offset from the track start in px. */
  position: number;
}

/**
 * Port of the frozen `Scrollbar.updateSize` + `setTranslate` math (no DOM).
 * `trackSize` is the scrollbar track's pixel length, measured by the consumer.
 * `slidesOffsetBefore` is not a headless param, so it is 0 in the divider.
 */
export function scrollbarModel(
  state: EngineState<unknown>,
  params: ScrollbarParams,
  trackSize: number,
): ScrollbarModel {
  const locked = state.snapGrid.length <= 1;
  const denom = state.virtualSize - (params.centered ? state.snapGrid[0]! : 0);
  const divider = state.size <= 0 || denom <= 0 ? Infinity : state.size / denom;
  if (divider >= 1) {
    return { hidden: true, locked, size: 0, position: 0 };
  }

  const progress = params.loop ? state.progressLoop : state.progress;
  let dragSize = trackSize * divider;
  let newPos = (trackSize - dragSize) * progress;
  if (params.rtl) {
    newPos = -newPos;
    if (newPos > 0) {
      dragSize = dragSize - newPos;
      newPos = 0;
    } else if (-newPos + dragSize > trackSize) {
      dragSize = trackSize + newPos;
    }
  } else if (newPos < 0) {
    dragSize = dragSize + newPos;
    newPos = 0;
  } else if (newPos + dragSize > trackSize) {
    dragSize = trackSize - newPos;
  }
  return { hidden: false, locked, size: dragSize, position: newPos };
}
