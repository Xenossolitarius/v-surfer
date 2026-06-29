import type { EngineState } from './types';

export type PaginationType = 'bullets' | 'fraction' | 'progressbar';

export interface PaginationParams {
  type: PaginationType;
  loop: boolean;
  slidesPerGroup: number;
  slidesLength: number;
}

export interface PaginationModel {
  type: PaginationType;
  total: number;
  current: number;
  bullets: number[];
  fraction: { current: number; total: number };
  progress: number;
  locked: boolean;
}

/** The snapGrid index nearest the current `-translate` (the active snap / `snapIndex`). */
export function snapIndexFromTranslate(translate: number, snapGrid: number[]): number {
  const target = -translate;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < snapGrid.length; i += 1) {
    const dist = Math.abs(snapGrid[i] - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Port of the current/total derivation in `src/modules/pagination/pagination.ts:121-147`.
 * total: loop → ceil(slidesLength/slidesPerGroup); else snapGrid.length.
 * current: loop → floor(realIndex/slidesPerGroup); else snapIndex (nearest snap to -translate;
 *   equals activeIndex when slidesPerGroup === 1). Clamped to [0, total-1].
 */
export function paginationModel(
  state: EngineState<unknown>,
  params: PaginationParams,
): PaginationModel {
  const locked = state.snapGrid.length <= 1;
  const total = params.loop
    ? Math.ceil(params.slidesLength / params.slidesPerGroup)
    : state.snapGrid.length;
  const rawCurrent = params.loop
    ? Math.floor(state.realIndex / params.slidesPerGroup)
    : snapIndexFromTranslate(state.translate, state.snapGrid);
  const current = Math.min(Math.max(rawCurrent, 0), Math.max(total - 1, 0));
  return {
    type: params.type,
    total,
    current,
    bullets: Array.from({ length: total }, (_, i) => i),
    fraction: { current: current + 1, total },
    progress: total === 0 ? 0 : (current + 1) / total,
    locked,
  };
}

/** Pagination container class names (frozen pagination parity: base + type + lock). */
export function paginationContainerClasses(model: PaginationModel): string[] {
  const c = ['v-surfer-pagination', `v-surfer-pagination-${model.type}`];
  if (model.locked) c.push('v-surfer-pagination-lock');
  return c;
}

/** Bullet class names; active only at the current index. */
export function paginationBulletClasses(index: number, current: number): string[] {
  const c = ['v-surfer-pagination-bullet'];
  if (index === current) c.push('v-surfer-pagination-bullet-active');
  return c;
}
