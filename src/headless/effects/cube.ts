/**
 * Pure math for the cube 3D effect.
 *
 * Note: the Safari/WebView z-factor (browser.needPerspectiveFix) from frozen is
 * intentionally omitted. The kit has no browser-detection layer, so zFactor is
 * always 0 here, matching the non-Safari frozen path.
 */

import type { EffectCtx } from '../../vue/effects/base';
import { getRotateFix } from '../../vue/effects/rotate-fix';

export interface CubeParams {
  slideShadows: boolean;
  shadow: boolean;
  shadowOffset: number;
  shadowScale: number;
}

/**
 * Compute the per-slide face transform for one slide.
 *
 * @param realIndex   slide.realIndex (kit equivalent of frozen `i` / `data-v-surfer-slide-index`)
 * @param progress    slide.progress, clamped to [-1,1] inside for shadow; unclamped for face tx
 * @param ctx         EffectCtx from the host
 * @returns           CSS `transform` string and `wrapperRotate` contribution (0 when not in range)
 */
export function cubeSlideTransform(
  realIndex: number,
  progress: number,
  ctx: EffectCtx,
): { transform: string; wrapperRotate: number } {
  const r = getRotateFix();
  const isHorizontal = ctx.axis === 'horizontal';
  const rtl = ctx.rtl;
  const surferSize = ctx.containerSize;

  let slideAngle = realIndex * 90;
  let round = Math.floor(slideAngle / 360);
  if (rtl) {
    slideAngle = -slideAngle;
    round = Math.floor(-slideAngle / 360);
  }

  let tx = 0;
  let ty = 0;
  let tz = 0;

  if (realIndex % 4 === 0) {
    tx = -round * 4 * surferSize;
    tz = 0;
  } else if ((realIndex - 1) % 4 === 0) {
    tx = 0;
    tz = -round * 4 * surferSize;
  } else if ((realIndex - 2) % 4 === 0) {
    tx = surferSize + round * 4 * surferSize;
    tz = surferSize;
  } else if ((realIndex - 3) % 4 === 0) {
    tx = -surferSize;
    tz = 3 * surferSize + surferSize * 4 * round;
  }

  if (rtl) {
    tx = -tx;
  }

  if (!isHorizontal) {
    ty = tx;
    tx = 0;
  }

  const transform = `rotateX(${r(isHorizontal ? 0 : -slideAngle)}deg) rotateY(${r(isHorizontal ? slideAngle : 0)}deg) translate3d(${tx}px, ${ty}px, ${tz}px)`;

  // wrapperRotate contribution: only for the "active face" slide (progress in (-1, 1])
  let wrapperRotate = 0;
  if (progress <= 1 && progress > -1) {
    wrapperRotate = realIndex * 90 + progress * 90;
    if (rtl) wrapperRotate = -realIndex * 90 - progress * 90;
  }

  return { transform, wrapperRotate };
}

/**
 * Compute the wrapper element's transform and transformOrigin for the cube.
 * zFactor = 0 (Safari needPerspectiveFix omitted).
 */
export function cubeWrapperTransform(
  wrapperRotate: number,
  ctx: EffectCtx,
): { transform: string; transformOrigin: string } {
  const r = getRotateFix();
  const isHorizontal = ctx.axis === 'horizontal';
  const surferSize = ctx.containerSize;
  const zFactor = 0; // Safari z-fix intentionally omitted

  const transform = `translate3d(0px,0,${zFactor}px) rotateX(${r(isHorizontal ? 0 : wrapperRotate)}deg) rotateY(${r(isHorizontal ? -wrapperRotate : 0)}deg)`;
  const transformOrigin = `50% 50% -${surferSize / 2}px`;

  return { transform, transformOrigin };
}

/**
 * Compute the `.v-surfer-cube-shadow` element's transform.
 *
 * Horizontal: appended to the WRAPPER; uses containerSize as surferWidth.
 * Vertical:   appended to the CONTAINER; uses containerSize as surferHeight.
 */
export function cubeShadowTransform(
  wrapperRotate: number,
  ctx: EffectCtx,
  params: CubeParams,
): string {
  const isHorizontal = ctx.axis === 'horizontal';
  const { shadowOffset, shadowScale } = params;

  if (isHorizontal) {
    const surferWidth = ctx.containerSize;
    return `translate3d(0px, ${surferWidth / 2 + shadowOffset}px, ${-surferWidth / 2}px) rotateX(89.99deg) rotateZ(0deg) scale(${shadowScale})`;
  } else {
    const surferHeight = ctx.containerSize;
    const shadowAngle = Math.abs(wrapperRotate) - Math.floor(Math.abs(wrapperRotate) / 90) * 90;
    const multiplier =
      1.5 -
      (Math.sin((shadowAngle * 2 * Math.PI) / 360) / 2 +
        Math.cos((shadowAngle * 2 * Math.PI) / 360) / 2);
    const scale1 = shadowScale;
    const scale2 = shadowScale / multiplier;
    const offset = shadowOffset;
    return `scale3d(${scale1}, 1, ${scale2}) translate3d(0px, ${surferHeight / 2 + offset}px, ${-surferHeight / 2 / scale2}px) rotateX(-89.99deg)`;
  }
}

/**
 * Compute per-slide shadow opacities (before/after faces).
 * Progress is clamped to [-1,1] (matching frozen createSlideShadows).
 */
export function cubeSlideShadowOpacity(rawProgress: number): {
  beforeOpacity: number;
  afterOpacity: number;
} {
  const progress = Math.max(Math.min(rawProgress, 1), -1);
  return {
    beforeOpacity: Math.max(-progress, 0),
    afterOpacity: Math.max(progress, 0),
  };
}
