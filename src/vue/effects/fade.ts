import { defineEffectModule } from './base';
import { fadeSlideStyle } from '../../headless/effects/fade';

const { module, component } = defineEffectModule<{ crossFade: boolean }>({
  name: 'fade',
  defaults: { crossFade: false },
  classes: () => ['v-surfer-fade'],
  virtualTranslate: (ctx) => !ctx.cssMode,
  paramOverrides: () => ({ slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 0 }),
  slideStyle: (slide, ctx, params) => fadeSlideStyle(slide, ctx, params),
});

export const EffectFadeModule = module;
export default component; // <KitEffectFade>
