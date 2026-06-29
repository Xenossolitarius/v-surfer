import { defineEffectModule } from './base';
import { cardsSlideStyle, cardsShadows } from '../../headless/effects/cards';
import type { CardsParams } from '../../headless/effects/cards';

// NOTE: The frozen cards effect sets `wrapperEl.style.transform = translateX(${minTranslate}px)`
// when centeredSlides && !cssMode (to re-anchor the wrapper under virtualTranslate mode).
// `minTranslate` is not exposed in EngineState, so this wrapper-translate special-case is
// intentionally omitted here. It does not affect per-slide cardsSlideStyle calculations or tests.

const { module, component } = defineEffectModule<CardsParams>({
  name: 'cards',
  defaults: { slideShadows: true, rotate: true, perSlideRotate: 2, perSlideOffset: 8 },
  classes: () => ['v-surfer-cards'],
  virtualTranslate: (ctx) => !ctx.cssMode,
  paramOverrides: (_ctx, p) => ({
    slidesPerView: 1,
    slidesPerGroup: 1,
    spaceBetween: 0,
    centeredSlides: true,
    loopAdditionalSlides: p.rotate ? 3 : 2,
  }),
  slideStyle: (slide, ctx, params) => cardsSlideStyle(slide, ctx, params),
  shadows: (slide, ctx, params) => (params.slideShadows ? cardsShadows(slide, ctx, params) : []),
});

export const EffectCardsModule = module;
export default component; // <KitEffectCards>
