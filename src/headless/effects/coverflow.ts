import type { ComputedSlide } from '../types';
import type { EffectCtx, ShadowSpec, SlideStyle } from '../../vue/effects/base';
import { getRotateFix } from '../../vue/effects/rotate-fix';

export interface CoverflowParams {
  rotate: number;
  stretch: number | string;
  depth: number;
  scale: number;
  modifier: number | ((offset: number) => number);
  slideShadows: boolean;
}

export function coverflowSlideStyle(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: CoverflowParams,
): SlideStyle {
  const fix = getRotateFix();
  const isHorizontal = ctx.axis === 'horizontal';
  const transform = ctx.state.translate;
  const containerSize = ctx.containerSize;

  // center is the midpoint of the visible area in content coordinates
  const center = -transform + containerSize / 2;

  // frozen: rotate = isHorizontal ? params.rotate : -params.rotate
  const rotate = isHorizontal ? params.rotate : -params.rotate;
  const depthVal = params.depth;

  const slideOffset = slide.offset;
  const slideSize = ctx.state.slidesSizesGrid[slide.index];

  const centerOffset = (center - slideOffset - slideSize / 2) / slideSize;
  const offsetMultiplier =
    typeof params.modifier === 'function'
      ? params.modifier(centerOffset)
      : centerOffset * params.modifier;

  let rotateY = isHorizontal ? rotate * offsetMultiplier : 0;
  let rotateX = isHorizontal ? 0 : rotate * offsetMultiplier;
  let translateZ = -depthVal * Math.abs(offsetMultiplier);

  let stretch: number = params.stretch as number;
  // Allow percentage to make a relative stretch for responsive sliders
  if (typeof params.stretch === 'string' && params.stretch.indexOf('%') !== -1) {
    stretch = (parseFloat(params.stretch) / 100) * slideSize;
  }
  let translateY = isHorizontal ? 0 : stretch * offsetMultiplier;
  let translateX = isHorizontal ? stretch * offsetMultiplier : 0;

  let scale = 1 - (1 - params.scale) * Math.abs(offsetMultiplier);

  // Fix for ultra small values
  if (Math.abs(translateX) < 0.001) translateX = 0;
  if (Math.abs(translateY) < 0.001) translateY = 0;
  if (Math.abs(translateZ) < 0.001) translateZ = 0;
  if (Math.abs(rotateY) < 0.001) rotateY = 0;
  if (Math.abs(rotateX) < 0.001) rotateX = 0;
  if (Math.abs(scale) < 0.001) scale = 0;

  // Note: frozen uses double-space between translate3d and rotateX — preserved exactly
  const slideTransform = `translate3d(${translateX}px,${translateY}px,${translateZ}px)  rotateX(${fix(rotateX)}deg) rotateY(${fix(rotateY)}deg) scale(${scale})`;

  const zIndex = -Math.abs(Math.round(offsetMultiplier)) + 1;

  return { transform: slideTransform, zIndex };
}

export function coverflowShadows(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: CoverflowParams,
): ShadowSpec[] {
  const isHorizontal = ctx.axis === 'horizontal';
  const transform = ctx.state.translate;
  const containerSize = ctx.containerSize;

  const center = -transform + containerSize / 2;
  const slideOffset = slide.offset;
  const slideSize = ctx.state.slidesSizesGrid[slide.index];

  const centerOffset = (center - slideOffset - slideSize / 2) / slideSize;
  const offsetMultiplier =
    typeof params.modifier === 'function'
      ? params.modifier(centerOffset)
      : centerOffset * params.modifier;

  const beforeDir = isHorizontal ? 'left' : 'top';
  const afterDir = isHorizontal ? 'right' : 'bottom';

  return [
    {
      className: `v-surfer-slide-shadow v-surfer-slide-shadow-${beforeDir} v-surfer-slide-shadow-coverflow`,
      // before opacity: max(offsetMultiplier, 0)
      opacity: offsetMultiplier > 0 ? offsetMultiplier : 0,
    },
    {
      className: `v-surfer-slide-shadow v-surfer-slide-shadow-${afterDir} v-surfer-slide-shadow-coverflow`,
      // after opacity: max(-offsetMultiplier, 0)
      opacity: -offsetMultiplier > 0 ? -offsetMultiplier : 0,
    },
  ];
}
