import type { ComputedSlide, EngineState } from '../types';

export interface FadeParams {
  crossFade: boolean;
}
export interface FadeCtx {
  axis: 'horizontal' | 'vertical';
  state: EngineState<unknown>;
}

export function fadeSlideStyle(
  slide: ComputedSlide<unknown>,
  ctx: FadeCtx,
  params: FadeParams,
): { transform: string; opacity: number } {
  let tx = -slide.offset;
  let ty = 0;
  if (ctx.axis === 'vertical') {
    ty = tx;
    tx = 0;
  }
  const opacity = params.crossFade
    ? Math.max(1 - Math.abs(slide.progress), 0)
    : 1 + Math.min(Math.max(slide.progress, -1), 0);
  return { transform: `translate3d(${tx}px, ${ty}px, 0px)`, opacity };
}
