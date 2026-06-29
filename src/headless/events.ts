import type { EngineState } from './types';

export interface EngineEvent {
  name: string;
  arg?: number;
}

// snapIndexOf = index of the snapGrid entry nearest to -translate (frozen's snapIndex).
export function snapIndexOf(snapGrid: number[], translate: number): number {
  const target = -translate;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < snapGrid.length; i += 1) {
    const d = Math.abs(snapGrid[i] - target);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function sameNumbers(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Pure snapshot-delta → event list. Returns the named events to emit for the
 * transition from `prev` to `next`, in a stable frozen-like order. `prev === null`
 * (the first commit) yields no events.
 */
export function diffEvents(
  prev: EngineState<unknown> | null,
  next: EngineState<unknown>,
): EngineEvent[] {
  if (prev === null) return [];
  const out: EngineEvent[] = [];

  if (prev.activeIndex !== next.activeIndex) {
    out.push({ name: 'activeIndexChange' });
    out.push({ name: 'slideChange' });
  }
  if (prev.realIndex !== next.realIndex) out.push({ name: 'realIndexChange' });
  if (prev.breakpoint !== next.breakpoint) out.push({ name: 'breakpoint' });
  if (snapIndexOf(prev.snapGrid, prev.translate) !== snapIndexOf(next.snapGrid, next.translate))
    out.push({ name: 'snapIndexChange' });

  if (!prev.isBeginning && next.isBeginning) out.push({ name: 'reachBeginning' });
  if (!prev.isEnd && next.isEnd) out.push({ name: 'reachEnd' });
  const prevEdge = prev.isBeginning || prev.isEnd;
  const nextEdge = next.isBeginning || next.isEnd;
  if (!prevEdge && nextEdge) out.push({ name: 'toEdge' });
  if (prevEdge && !nextEdge) out.push({ name: 'fromEdge' });

  if (!prev.isLocked && next.isLocked) out.push({ name: 'lock' });
  if (prev.isLocked && !next.isLocked) out.push({ name: 'unlock' });

  if (prev.translate !== next.translate) out.push({ name: 'setTranslate', arg: next.translate });
  if (prev.transitionDuration !== next.transitionDuration)
    out.push({ name: 'setTransition', arg: next.transitionDuration });
  if (prev.progress !== next.progress) out.push({ name: 'progress', arg: next.progress });

  if (prev.slides.length !== next.slides.length) out.push({ name: 'slidesLengthChange' });
  if (prev.snapGrid.length !== next.snapGrid.length) out.push({ name: 'snapGridLengthChange' });
  if (prev.slidesGrid.length !== next.slidesGrid.length)
    out.push({ name: 'slidesGridLengthChange' });
  if (
    !sameNumbers(prev.slidesGrid, next.slidesGrid) ||
    !sameNumbers(prev.snapGrid, next.snapGrid) ||
    !sameNumbers(prev.slidesSizesGrid, next.slidesSizesGrid)
  ) {
    out.push({ name: 'slidesUpdated' });
  }

  if (prev.layout.direction !== next.layout.direction) out.push({ name: 'changeDirection' });

  return out;
}
