import { defineEffectModule } from './base';
import { creativeSlideStyle, creativeShadows } from '../../headless/effects/creative';
import type { CreativeParams } from '../../headless/effects/creative';

const { module, component } = defineEffectModule<CreativeParams>({
  name: 'creative',
  defaults: {
    limitProgress: 1,
    shadowPerProgress: false,
    progressMultiplier: 1,
    perspective: true,
    prev: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
    next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
  },
  // Add v-surfer-3d when perspective is enabled (default: true)
  classes: (_ctx, p) =>
    p.perspective ? ['v-surfer-creative', 'v-surfer-3d'] : ['v-surfer-creative'],
  // Creative uses virtualTranslate (slides carry their own position)
  virtualTranslate: (ctx) => !ctx.cssMode,
  // Creative only forces watchSlidesProgress + virtualTranslate (handled by the engine via
  // the virtualTranslate field above; watchSlidesProgress is always on in the kit).
  // prev/next params are objects passed via host.config (not paramOverrides) — no primitives-only concern.
  paramOverrides: () => ({}),
  slideStyle: (slide, ctx, params) => creativeSlideStyle(slide, ctx, params),
  shadows: (slide, ctx, params) => creativeShadows(slide, ctx, params),
});

export const EffectCreativeModule = module;
export default component; // <KitEffectCreative>
