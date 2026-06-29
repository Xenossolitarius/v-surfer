import type { EngineState } from './types';

export interface NavigationParams {
  loop: boolean;
  rewind: boolean;
}

export interface NavigationModel {
  prevDisabled: boolean;
  nextDisabled: boolean;
  locked: boolean;
}

/**
 * Port of `src/modules/navigation/navigation.ts` update (lines 69-76): under loop both
 * buttons stay enabled (frozen returns early, `toggleEl(el, false)`) — loop has no end,
 * so isBeginning/isEnd are NOT consulted even when the engine reports them true.
 * Otherwise the toggle is `isBeginning && !rewind` / `isEnd && !rewind`.
 * `locked` (a single reachable snap) drives the lock class.
 */
export function navigationModel(
  state: EngineState<unknown>,
  params: NavigationParams,
): NavigationModel {
  return {
    prevDisabled: !params.loop && state.isBeginning && !params.rewind,
    nextDisabled: !params.loop && state.isEnd && !params.rewind,
    locked: state.snapGrid.length <= 1,
  };
}

/** Prev-button class names (frozen navigation parity). */
export function navigationPrevClasses(model: NavigationModel): string[] {
  const c = ['v-surfer-button-prev'];
  if (model.prevDisabled) c.push('v-surfer-button-disabled');
  if (model.locked) c.push('v-surfer-button-lock');
  return c;
}

/** Next-button class names (frozen navigation parity). */
export function navigationNextClasses(model: NavigationModel): string[] {
  const c = ['v-surfer-button-next'];
  if (model.nextDisabled) c.push('v-surfer-button-disabled');
  if (model.locked) c.push('v-surfer-button-lock');
  return c;
}
