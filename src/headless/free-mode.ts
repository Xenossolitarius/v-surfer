import type { EngineParams } from './types';
import { rtlTranslate } from './direction';

/** A position/time sample captured during the drag (horizontal/LTR uses the X axis). */
export interface VelocitySample {
  position: number;
  time: number;
}

/** Everything `freeModeRelease` reads — the live geometry plus the captured drag velocities. */
export interface FreeModeInput {
  velocities: VelocitySample[];
  endTime: number; // now() at release; plays the role of the frozen `now()`
  touchStartTime: number;
  translate: number; // committed wrapper translate after follow-finger (≤ 0 LTR)
  minTranslate: number;
  maxTranslate: number;
  snapGrid: number[];
  slidesGrid: number[];
  slidesSizesGrid: number[];
  slidesLength: number;
  activeIndex: number;
  swipeDirection: 'prev' | 'next' | undefined;
  params: EngineParams;
}

/**
 * The outcome of a freeMode release, mapped by the engine to its primitives:
 * - `slideTo`  — overscroll clamps and sticky `slideToClosest` (snap to a slide index).
 * - `momentum` — commit an arbitrary translate with a computed duration (0 = no animation).
 * - `bounce`   — overshoot past the boundary, then settle to `afterBouncePosition` (phase 2).
 * - `static`   — momentum off, not sticky: keep the current translate, recompute the index.
 */
export type FreeModeResult =
  | { kind: 'slideTo'; index: number; speed: number }
  | { kind: 'momentum'; translate: number; transitionDuration: number }
  | {
      kind: 'bounce';
      translate: number;
      transitionDuration: number;
      afterBouncePosition: number;
      settleSpeed: number;
    }
  | { kind: 'static' };

/**
 * Port of `Surfer.prototype.slideToClosest` (`src/core/slide/slideToClosest.ts`)
 * with the default 0.5 threshold: pick the slide index whose snap is nearest the
 * current `-translate`. Returns the slide index to snap to.
 */
function slideToClosest(input: FreeModeInput): FreeModeResult {
  const { translate, snapGrid, slidesGrid, activeIndex, params } = input;
  const threshold = 0.5; // snap forward once past the midpoint of the gap
  let index = activeIndex;
  const skip = Math.min(params.slidesPerGroupSkip, index);
  const snapIndex = skip + Math.floor((index - skip) / params.slidesPerGroup);
  const t = -translate;
  if (t >= snapGrid[snapIndex]) {
    const currentSnap = snapGrid[snapIndex];
    const nextSnap = snapGrid[snapIndex + 1];
    if (t - currentSnap > (nextSnap - currentSnap) * threshold) {
      index += params.slidesPerGroup;
    }
  } else {
    const prevSnap = snapGrid[snapIndex - 1];
    const currentSnap = snapGrid[snapIndex];
    if (t - prevSnap <= (currentSnap - prevSnap) * threshold) {
      index -= params.slidesPerGroup;
    }
  }
  index = Math.max(index, 0);
  index = Math.min(index, slidesGrid.length - 1);
  return { kind: 'slideTo', index, speed: params.speed };
}

/**
 * Port of `freeMode.onTouchEnd` (`src/modules/free-mode/free-mode.ts:46-232`),
 * LTR-horizontal only. Computes the release velocity from the captured samples and
 * resolves the resting translate (momentum), the snap target (sticky), the overshoot +
 * settle (bounce), or a static hold. DOM, RTL, loop, cssMode and event emits are removed.
 */
export function freeModeRelease(input: FreeModeInput): FreeModeResult {
  const {
    velocities,
    endTime,
    translate,
    minTranslate,
    maxTranslate,
    snapGrid,
    slidesSizesGrid,
    slidesLength,
    activeIndex,
    swipeDirection,
    params,
  } = input;

  const currentPos = -translate; // followFinger, LTR

  // Overscroll clamps (free-mode.ts:57-68).
  if (currentPos < -minTranslate) {
    return { kind: 'slideTo', index: activeIndex, speed: params.speed };
  }
  if (currentPos > -maxTranslate) {
    const index = slidesLength < snapGrid.length ? snapGrid.length - 1 : slidesLength - 1;
    return { kind: 'slideTo', index, speed: params.speed };
  }

  if (params.freeModeMomentum) {
    // Velocity from the last two samples (free-mode.ts:71-92).
    let velocity = 0;
    if (velocities.length > 1) {
      const last = velocities[velocities.length - 1];
      const prev = velocities[velocities.length - 2];
      const distance = last.position - prev.position;
      const time = last.time - prev.time;
      velocity = distance / time / 2;
      if (Math.abs(velocity) < params.freeModeMinimumVelocity) velocity = 0;
      // A finger that paused before lifting leaves a stale last sample.
      if (time > 150 || endTime - last.time > 300) velocity = 0;
    }
    velocity *= params.freeModeMomentumVelocityRatio;
    // RTL mirrors the drag, so the momentum direction flips too (the engine is
    // canonical internally; this keeps the projected resting translate canonical).
    // Only on the horizontal axis — vertical rtl is a no-op (see rtlTranslate).
    if (rtlTranslate(params.rtl, params.direction)) velocity = -velocity;

    let momentumDuration = 1000 * params.freeModeMomentumRatio;
    const momentumDistance = velocity * momentumDuration;
    let newPosition = translate + momentumDistance;

    let doBounce = false;
    let afterBouncePosition = 0;
    const bounceAmount = Math.abs(velocity) * 20 * params.freeModeMomentumBounceRatio;

    if (newPosition < maxTranslate) {
      // Past the end.
      if (params.freeModeMomentumBounce) {
        if (newPosition + maxTranslate < -bounceAmount) {
          newPosition = maxTranslate - bounceAmount;
        }
        afterBouncePosition = maxTranslate;
        doBounce = true;
      } else {
        newPosition = maxTranslate;
      }
    } else if (newPosition > minTranslate) {
      // Past the beginning.
      if (params.freeModeMomentumBounce) {
        if (newPosition - minTranslate > bounceAmount) {
          newPosition = minTranslate + bounceAmount;
        }
        afterBouncePosition = minTranslate;
        doBounce = true;
      } else {
        newPosition = minTranslate;
      }
    } else if (params.freeModeSticky) {
      // Snap the projected position to the nearest snap neighbour (free-mode.ts:127-146).
      // Reached only when newPosition is in-bounds, so snapGrid is non-empty here.
      let nextSlide = 0;
      for (let j = 0; j < snapGrid.length; j += 1) {
        if (snapGrid[j] > -newPosition) {
          nextSlide = j;
          break;
        }
      }
      if (
        Math.abs(snapGrid[nextSlide] - newPosition) <
          Math.abs(snapGrid[nextSlide - 1] - newPosition) ||
        swipeDirection === 'next'
      ) {
        newPosition = snapGrid[nextSlide];
      } else {
        newPosition = snapGrid[nextSlide - 1];
      }
      newPosition = -newPosition;
    }

    // Duration fix-up (free-mode.ts:152-180).
    if (velocity !== 0) {
      momentumDuration = Math.abs((newPosition - translate) / velocity);
      if (params.freeModeSticky) {
        const moveDistance = Math.abs(newPosition - translate);
        const currentSlideSize = slidesSizesGrid[activeIndex];
        if (moveDistance < currentSlideSize) {
          momentumDuration = params.speed;
        } else if (moveDistance < 2 * currentSlideSize) {
          momentumDuration = params.speed * 1.5;
        } else {
          momentumDuration = params.speed * 2.5;
        }
      }
    } else if (params.freeModeSticky) {
      return slideToClosest(input);
    }

    if (params.freeModeMomentumBounce && doBounce) {
      return {
        kind: 'bounce',
        translate: newPosition,
        transitionDuration: momentumDuration,
        afterBouncePosition,
        settleSpeed: params.speed,
      };
    }
    // velocity 0 + in bounds → newPosition === translate, commit with no animation.
    return {
      kind: 'momentum',
      translate: newPosition,
      transitionDuration: velocity !== 0 ? momentumDuration : 0,
    };
  }

  if (params.freeModeSticky) {
    return slideToClosest(input);
  }
  return { kind: 'static' };
}
