import type { ComputedSlide } from '../types';
import type { EffectCtx, ShadowSpec, SlideStyle } from '../../vue/effects/base';

export interface CardsParams {
  slideShadows: boolean;
  rotate: boolean;
  perSlideRotate: number;
  perSlideOffset: number;
}

export function cardsSlideStyle(
  slide: ComputedSlide<unknown>,
  ctx: EffectCtx,
  params: CardsParams,
): SlideStyle {
  const { axis, rtl, cssMode } = ctx;
  const { touching, startTranslate, activeIndex } = ctx.state;
  const translate = ctx.state.translate;

  const isHorizontal = axis === 'horizontal';
  const currentTranslate = rtl ? -translate : translate;

  const slideProgress = slide.progress;
  const progress = Math.min(Math.max(slideProgress, -4), 4);
  const offset = slide.offset;

  let tX: number | string = cssMode ? -offset - translate : -offset;
  let tY: number | string = 0;
  const tZ = -100 * Math.abs(progress);
  let scale = 1;
  let rotate = -params.perSlideRotate * progress;
  let tXAdd = params.perSlideOffset - Math.abs(progress) * 0.75;

  const slideIndex = slide.index;

  const isSwipeToNext =
    (slideIndex === activeIndex || slideIndex === activeIndex - 1) &&
    progress > 0 &&
    progress < 1 &&
    (touching || cssMode) &&
    currentTranslate < startTranslate;

  const isSwipeToPrev =
    (slideIndex === activeIndex || slideIndex === activeIndex + 1) &&
    progress < 0 &&
    progress > -1 &&
    (touching || cssMode) &&
    currentTranslate > startTranslate;

  if (isSwipeToNext || isSwipeToPrev) {
    const subProgress = (1 - Math.abs((Math.abs(progress) - 0.5) / 0.5)) ** 0.5;
    rotate += -28 * progress * subProgress;
    scale += -0.5 * subProgress;
    tXAdd += 96 * subProgress;
    tY = `${(params.rotate || isHorizontal ? -25 : 0) * subProgress * Math.abs(progress)}%`;
  }

  if (progress < 0) {
    // next slide
    tX = `calc(${tX}px ${rtl ? '-' : '+'} (${tXAdd * Math.abs(progress)}%))`;
  } else if (progress > 0) {
    // prev slide
    tX = `calc(${tX}px ${rtl ? '-' : '+'} (-${tXAdd * Math.abs(progress)}%))`;
  } else {
    tX = `${tX}px`;
  }

  if (!isHorizontal) {
    const prevY = tY;
    tY = tX;
    tX = prevY;
  }

  const scaleString =
    progress < 0 ? `${1 + (1 - scale) * progress}` : `${1 - (1 - scale) * progress}`;

  const transform = `
        translate3d(${tX}, ${tY}, ${tZ}px)
        rotateZ(${params.rotate ? (rtl ? -rotate : rotate) : 0}deg)
        scale(${scaleString})
      `;

  const zIndex = -Math.abs(Math.round(slideProgress)) + ctx.state.slides.length;

  return { transform, zIndex };
}

export function cardsShadows(
  slide: ComputedSlide<unknown>,
  _ctx: EffectCtx,
  _params: CardsParams,
): ShadowSpec[] {
  const progress = slide.progress;
  const opacity = Math.min(Math.max((Math.abs(progress) - 0.5) / 0.5, 0), 1);

  return [
    {
      className: 'v-surfer-slide-shadow v-surfer-slide-shadow-cards',
      opacity,
    },
  ];
}
