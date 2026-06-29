import type { ComputedSlide } from '../types';
import type { EffectCtx, ShadowSpec, SlideStyle } from '../../vue/effects/base';
import { getRotateFix } from '../../vue/effects/rotate-fix';

/** Per-direction (prev/next) transform spec. */
export interface CreativeTransformSpec {
  translate: (string | number)[];
  rotate: number[];
  scale: number;
  opacity: number;
  shadow?: boolean;
  origin?: string;
}

export interface CreativeParams {
  limitProgress: number;
  shadowPerProgress: boolean;
  progressMultiplier: number;
  perspective: boolean;
  prev: CreativeTransformSpec;
  next: CreativeTransformSpec;
}

/** Convert a translate value: strings pass through as-is, numbers get a px suffix. */
function getTranslateValue(value: string | number): string {
  if (typeof value === 'string') return value;
  return `${value}px`;
}

/**
 * Compute per-slide style for the creative effect.
 *
 * Port of frozen effect-creative.ts `setTranslate`, adapted for the kit:
 *
 * - `slide.progress` is used for BOTH the `progress` and `originalProgress` roles.
 *   Frozen distinguishes them only for the non-centeredSlides path (which reduces the
 *   scale/opacity multiplier). Creative is almost always used with centeredSlides, where
 *   frozen uses `progress` for both anyway — so this simplification is safe for the
 *   common case. (Note: `ComputedSlide` does not expose `originalProgress`.)
 *
 * - The frozen `isCenteredSlides` branch that writes `wrapperEl.style.transform` is
 *   intentionally omitted. Creative uses `virtualTranslate`, so the wrapper is already
 *   un-transformed; the wrapper-centering offset is a host/engine concern.
 */
export function creativeSlideStyle(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: CreativeParams,
): SlideStyle {
  const fix = getRotateFix();
  const isHorizontal = ctx.axis === 'horizontal';
  const multiplier = params.progressMultiplier;
  const limitProgress = params.limitProgress;

  // Unclamped progress used only for zIndex calculation (matches frozen slideProgress)
  const slideProgress = slide.progress;
  const progress = Math.min(Math.max(slide.progress, -limitProgress), limitProgress);

  // Kit simplification: use `progress` for both `progress` and `originalProgress` roles.
  // See jsdoc above for rationale.
  const originalProgress = progress;

  const offset = slide.offset;

  // Base translate: when cssMode, the wrapper is not translated so we must account for it
  const t: (string | number)[] = [ctx.cssMode ? -offset - ctx.state.translate : -offset, 0, 0];
  const r = [0, 0, 0];

  if (!isHorizontal) {
    t[1] = t[0];
    t[0] = 0;
  }

  // Pick transform spec based on progress direction
  let data: CreativeTransformSpec = {
    translate: [0, 0, 0],
    rotate: [0, 0, 0],
    scale: 1,
    opacity: 1,
  };
  let custom = false;
  if (progress < 0) {
    data = params.next;
    custom = true;
  } else if (progress > 0) {
    data = params.prev;
    custom = true;
  }

  // Build calc()-based translate strings
  t.forEach((value, index) => {
    t[index] = `calc(${value}px + (${getTranslateValue(data.translate[index]!)} * ${Math.abs(
      progress * multiplier,
    )}))`;
  });

  // Build rotate values
  r.forEach((_value, index) => {
    r[index] = data.rotate[index]! * Math.abs(progress * multiplier);
  });

  const zIndex = -Math.abs(Math.round(slideProgress)) + ctx.state.slidesSizesGrid.length;

  const translateString = t.join(', ');
  const rotateString = `rotateX(${fix(r[0]!)}deg) rotateY(${fix(r[1]!)}deg) rotateZ(${fix(r[2]!)}deg)`;

  // Scale and opacity use originalProgress (= progress in this kit — see simplification note above)
  const scaleVal =
    originalProgress < 0
      ? 1 + (1 - data.scale) * originalProgress * multiplier
      : 1 - (1 - data.scale) * originalProgress * multiplier;

  const opacityVal =
    originalProgress < 0
      ? 1 + (1 - data.opacity) * originalProgress * multiplier
      : 1 - (1 - data.opacity) * originalProgress * multiplier;

  const scaleString = `scale(${scaleVal})`;
  const transform = `translate3d(${translateString}) ${rotateString} ${scaleString}`;

  const result: SlideStyle = {
    transform,
    opacity: opacityVal,
    zIndex,
  };

  if (data.origin) {
    result.transformOrigin = data.origin;
  }

  // custom is computed for parity with frozen; shadow visibility is recomputed independently in creativeShadows.
  void custom;

  return result;
}

/**
 * Compute shadow specs for the creative effect.
 *
 * Frozen logic: shadow is shown when `(custom && data.shadow) || !custom`.
 * A single `.v-surfer-slide-shadow.v-surfer-slide-shadow-creative` element is used.
 * Opacity is clamped to [0, 1]; source is |shadowPerProgress ? progress*(1/limitProgress) : progress|.
 */
export function creativeShadows(
  slide: ComputedSlide<unknown>,
  _ctx: EffectCtx,
  params: CreativeParams,
): ShadowSpec[] {
  const limitProgress = params.limitProgress;
  const progress = Math.min(Math.max(slide.progress, -limitProgress), limitProgress);

  let data: CreativeTransformSpec = {
    translate: [0, 0, 0],
    rotate: [0, 0, 0],
    scale: 1,
    opacity: 1,
  };
  let custom = false;
  if (progress < 0) {
    data = params.next;
    custom = true;
  } else if (progress > 0) {
    data = params.prev;
    custom = true;
  }

  const showShadow = (custom && !!data.shadow) || !custom;
  if (!showShadow) return [];

  const shadowOpacity = params.shadowPerProgress ? progress * (1 / limitProgress) : progress;
  const opacity = Math.min(Math.max(Math.abs(shadowOpacity), 0), 1);

  return [
    {
      className: 'v-surfer-slide-shadow v-surfer-slide-shadow-creative',
      opacity,
    },
  ];
}
