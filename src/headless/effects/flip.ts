import type { ComputedSlide } from '../types';
import type { EffectCtx, ShadowSpec, SlideStyle } from '../../vue/effects/base';
import { getRotateFix } from '../../vue/effects/rotate-fix';

export interface FlipParams {
  slideShadows: boolean;
  limitRotation: boolean;
}

export function flipSlideStyle(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: FlipParams,
): SlideStyle {
  const rotateFix = getRotateFix();

  let progress = slide.progress;
  if (params.limitRotation) {
    progress = Math.max(Math.min(slide.progress, 1), -1);
  }

  const offset = slide.offset;
  const rotate = -180 * progress;
  let rotateY = rotate;
  let rotateX = 0;
  let tx = ctx.cssMode ? -offset - ctx.state.translate : -offset;
  let ty = 0;

  if (ctx.axis !== 'horizontal') {
    ty = tx;
    tx = 0;
    rotateX = -rotateY;
    rotateY = 0;
  } else if (ctx.rtl) {
    rotateY = -rotateY;
  }

  const zIndex = -Math.abs(Math.round(progress)) + ctx.state.slides.length;

  const transform = `translate3d(${tx}px, ${ty}px, 0px) rotateX(${rotateFix(rotateX)}deg) rotateY(${rotateFix(rotateY)}deg)`;

  return { transform, zIndex };
}

export function flipShadows(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: FlipParams,
): ShadowSpec[] {
  let progress = slide.progress;
  if (params.limitRotation) {
    progress = Math.max(Math.min(slide.progress, 1), -1);
  }

  const isHorizontal = ctx.axis === 'horizontal';
  const beforeDir = isHorizontal ? 'left' : 'top';
  const afterDir = isHorizontal ? 'right' : 'bottom';

  return [
    {
      className: `v-surfer-slide-shadow v-surfer-slide-shadow-${beforeDir} v-surfer-slide-shadow-flip`,
      opacity: Math.max(-progress, 0),
    },
    {
      className: `v-surfer-slide-shadow v-surfer-slide-shadow-${afterDir} v-surfer-slide-shadow-flip`,
      opacity: Math.max(progress, 0),
    },
  ];
}
