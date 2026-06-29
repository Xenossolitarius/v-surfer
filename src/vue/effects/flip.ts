import { defineEffectModule } from './base';
import { flipSlideStyle, flipShadows } from '../../headless/effects/flip';
import type { FlipParams } from '../../headless/effects/flip';

const { module, component } = defineEffectModule<FlipParams>({
  name: 'flip',
  defaults: { slideShadows: true, limitRotation: true },
  classes: () => ['v-surfer-flip', 'v-surfer-3d'],
  virtualTranslate: (ctx) => !ctx.cssMode,
  paramOverrides: () => ({ slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 0 }),
  slideStyle: (slide, ctx, params) => flipSlideStyle(slide, ctx, params),
  shadows: (slide, ctx, params) => (params.slideShadows ? flipShadows(slide, ctx, params) : []),
});

export const EffectFlipModule = module;
export default component; // <KitEffectFlip>
