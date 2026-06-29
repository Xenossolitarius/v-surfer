import type { EngineParams } from './types';
import { minTranslate, maxTranslate } from './translate';

export interface ProgressResult {
  progress: number;
  isBeginning: boolean;
  isEnd: boolean;
}

/**
 * Port of the no-loop branch of `src/core/update/updateProgress.ts`.
 * `translate` is the signed wrapper translate (≤ 0 in LTR).
 */
export function computeProgress(translate: number, snapGrid: number[]): ProgressResult {
  const min = minTranslate(snapGrid);
  const max = maxTranslate(snapGrid);
  const translatesDiff = max - min;
  if (translatesDiff === 0) {
    return { progress: 0, isBeginning: true, isEnd: true };
  }
  let progress = (translate - min) / translatesDiff;
  const isBeginningRounded = Math.abs(translate - min) < 1;
  const isEndRounded = Math.abs(translate - max) < 1;
  const isBeginning = isBeginningRounded || progress <= 0;
  const isEnd = isEndRounded || progress >= 1;
  if (isBeginningRounded) progress = 0;
  if (isEndRounded) progress = 1;
  return { progress, isBeginning, isEnd };
}

/**
 * Port of the `params.loop` branch of `src/core/update/updateProgress.ts`.
 * A continuous 0..1 progress that does NOT reset when a loop wrap repositions
 * the translate, so a scrollbar thumb glides around the loop instead of
 * teleporting. `loopOrder[pos] = realIndex` (so `getSlideIndexByData(d)` is
 * `loopOrder.indexOf(d)`); `slidesLength` is the real (un-looped) slide count.
 */
export function computeLoopProgress(
  translate: number,
  slidesGrid: number[],
  loopOrder: number[],
  slidesLength: number,
): number {
  const translateMax = slidesGrid[slidesGrid.length - 1];
  if (!translateMax || slidesLength <= 0) return 0;
  const firstSlideIndex = loopOrder.indexOf(0);
  const lastSlideIndex = loopOrder.indexOf(slidesLength - 1);
  const firstSlideTranslate = slidesGrid[firstSlideIndex] ?? 0;
  const lastSlideTranslate = slidesGrid[lastSlideIndex] ?? 0;
  const translateAbs = Math.abs(translate);
  let progressLoop =
    translateAbs >= firstSlideTranslate
      ? (translateAbs - firstSlideTranslate) / translateMax
      : (translateAbs + translateMax - lastSlideTranslate) / translateMax;
  if (progressLoop > 1) progressLoop -= 1;
  return progressLoop;
}

/**
 * Port of `getActiveIndexByTranslate` from `src/core/update/updateActiveIndex.ts`
 * (no virtual). `translate` is the signed wrapper translate (≤ 0 in LTR).
 */
export function activeIndexByTranslate(
  translate: number,
  slidesGrid: number[],
  params: EngineParams,
): number {
  const t = -translate;
  let activeIndex: number | undefined;
  for (let i = 0; i < slidesGrid.length; i += 1) {
    if (typeof slidesGrid[i + 1] !== 'undefined') {
      if (t >= slidesGrid[i] && t < slidesGrid[i + 1] - (slidesGrid[i + 1] - slidesGrid[i]) / 2) {
        activeIndex = i;
      } else if (t >= slidesGrid[i] && t < slidesGrid[i + 1]) {
        activeIndex = i + 1;
      }
    } else if (t >= slidesGrid[i]) {
      activeIndex = i;
    }
  }
  if (params.normalizeSlideIndex) {
    if (activeIndex === undefined || activeIndex < 0) activeIndex = 0;
  }
  return activeIndex as number;
}
