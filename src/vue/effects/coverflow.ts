import { defineEffectModule } from './base';
import { coverflowSlideStyle, coverflowShadows } from '../../headless/effects/coverflow';
import type { CoverflowParams } from '../../headless/effects/coverflow';

const { module, component } = defineEffectModule<CoverflowParams>({
  name: 'coverflow',
  defaults: { rotate: 50, stretch: 0, depth: 100, scale: 1, modifier: 1, slideShadows: true },
  classes: () => ['v-surfer-coverflow', 'v-surfer-3d'],
  // Coverflow keeps the normal wrapper translate (does NOT use virtualTranslate)
  virtualTranslate: () => false,
  // frozen only forces watchSlidesProgress, which the engine always computes
  paramOverrides: () => ({}),
  slideStyle: (slide, ctx, params) => coverflowSlideStyle(slide, ctx, params),
  shadows: (slide, ctx, params) =>
    params.slideShadows ? coverflowShadows(slide, ctx, params) : [],
});

export const EffectCoverflowModule = module;
export default component; // <KitEffectCoverflow>
