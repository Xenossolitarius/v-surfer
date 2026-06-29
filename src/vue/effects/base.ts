import { defineComponent, onMounted, onBeforeUnmount, watch } from 'vue';
import { defineSurferModule, injectHost, type ModuleDef } from '../module-host';
import type { ComputedSlide, EngineParamsInput } from '../../headless/types';
import { ensureShadow, removeShadows } from './shadow';

export interface EffectCtx {
  axis: 'horizontal' | 'vertical';
  rtl: boolean;
  cssMode: boolean;
  state: import('../../headless/types').EngineState<unknown>;
  containerSize: number;
  crossSize: number;
}

export interface SlideStyle {
  transform?: string;
  opacity?: number | string;
  zIndex?: number;
  transformOrigin?: string;
}

export interface ShadowSpec {
  className: string;
  opacity: number;
}

// oxlint-disable-next-line typescript/no-explicit-any -- descriptor params are generic; narrowed at usage site
export interface EffectDescriptor<P extends object = Record<string, any>> {
  name: string;
  defaults: P;
  classes: (ctx: EffectCtx, params: P) => string[];
  virtualTranslate: (ctx: EffectCtx, params: P) => boolean;
  paramOverrides: (ctx: EffectCtx, params: P) => Partial<EngineParamsInput>;
  slideStyle: (slide: ComputedSlide<unknown>, ctx: EffectCtx, params: P) => SlideStyle;
  shadows?: (slide: ComputedSlide<unknown>, ctx: EffectCtx, params: P) => ShadowSpec[];
}

export interface EffectModuleResult {
  module: ModuleDef;
  component: ReturnType<typeof defineComponent>;
}

export function defineEffectModule<P extends object>(
  descriptor: EffectDescriptor<P>,
): EffectModuleResult {
  // Config-only module — carries typed host.config[name]
  // oxlint-disable-next-line typescript/no-explicit-any -- partial P config stored in generic module config
  const module = defineSurferModule<Partial<P>>()(descriptor.name);

  const component = defineComponent({
    name: `SurferEffect_${descriptor.name}`,

    setup() {
      const host = injectHost();

      const buildCtx = (): EffectCtx => {
        const s = host.state.value;
        const layout = s.layout;
        const containerEl = host.containerEl.value;
        const isVertical = layout.direction === 'vertical';
        return {
          axis: layout.direction,
          rtl: layout.rtl,
          cssMode: layout.cssMode,
          state: s,
          containerSize: containerEl
            ? isVertical
              ? containerEl.clientHeight
              : containerEl.clientWidth
            : 0,
          crossSize: containerEl
            ? isVertical
              ? containerEl.clientWidth
              : containerEl.clientHeight
            : 0,
        };
      };

      const resolveParams = (): P => {
        // oxlint-disable-next-line typescript/no-explicit-any -- config is untyped at runtime
        const configEntry = (host.config as Record<string, any>)[descriptor.name] as
          | Partial<P>
          | undefined;
        return { ...descriptor.defaults, ...configEntry };
      };

      // Publish effectClasses, virtualTranslate, paramOverrides — guarded to avoid
      // unnecessary shallowRef writes that would re-trigger watchers in a loop.
      const publishEffect = (): void => {
        const ctx = buildCtx();
        const params = resolveParams();

        const nextClasses = descriptor.classes(ctx, params);
        // Shallow array comparison to avoid spurious writes
        const prevClasses = host.effectClasses.value;
        if (
          prevClasses.length !== nextClasses.length ||
          prevClasses.some((c, i) => c !== nextClasses[i])
        ) {
          host.effectClasses.value = nextClasses;
        }

        const nextVt = descriptor.virtualTranslate(ctx, params);
        if (host.virtualTranslate.value !== nextVt) {
          host.virtualTranslate.value = nextVt;
        }

        const nextOverrides = descriptor.paramOverrides(ctx, params);
        // Shallow key/value comparison to avoid spurious writes
        const prevOverrides = host.paramOverrides.value;
        const prevKeys = Object.keys(prevOverrides) as (keyof EngineParamsInput)[];
        const nextKeys = Object.keys(nextOverrides) as (keyof EngineParamsInput)[];
        const overridesChanged =
          prevKeys.length !== nextKeys.length ||
          nextKeys.some(
            (k) =>
              (prevOverrides as Record<string, unknown>)[k] !==
              (nextOverrides as Record<string, unknown>)[k],
          );
        if (overridesChanged) {
          host.paramOverrides.value = nextOverrides;
        }
      };

      const apply = (): void => {
        const ctx = buildCtx();
        const params = resolveParams();
        const slideEls = host.slideEls.value;
        const slides = host.state.value.slides;

        for (let i = 0; i < slideEls.length; i++) {
          const el = slideEls[i];
          const slide = slides[i];
          if (!el || !slide) continue;

          const style = descriptor.slideStyle(slide, ctx, params);

          // Imperative DOM writes — do NOT mutate any reactive state (no shallowRef writes)
          if (style.transform !== undefined) el.style.transform = style.transform;
          if (style.opacity !== undefined) el.style.opacity = String(style.opacity);
          if (style.zIndex !== undefined) el.style.zIndex = String(style.zIndex);
          if (style.transformOrigin !== undefined) el.style.transformOrigin = style.transformOrigin;

          // Propagate the engine's transition duration to the per-slide transform/opacity so a
          // programmatic move animates (frozen does this via setTransition). The engine reports 0
          // during drag (instant follow) and `speed` on snap/next, so this is correct as-is.
          const durationMs = `${ctx.state.transitionDuration}ms`;
          el.style.transitionDuration = durationMs;

          if (descriptor.shadows) {
            const specs = descriptor.shadows(slide, ctx, params);

            // Remove shadow children not in the current spec list
            el.querySelectorAll('[class*="v-surfer-slide-shadow"]').forEach((child) => {
              const matchesASpec = specs.some((spec) => {
                const classes = spec.className.split(' ').filter(Boolean);
                return classes.every((c) => child.classList.contains(c));
              });
              if (!matchesASpec) child.remove();
            });

            // Ensure each spec shadow exists with correct opacity
            for (const spec of specs) {
              const shadowEl = ensureShadow(el, spec.className);
              shadowEl.style.opacity = String(spec.opacity);
              shadowEl.style.transitionDuration = durationMs;
            }
          } else {
            // No shadows descriptor — remove any leftover effect shadows
            removeShadows(el, '[class*="v-surfer-slide-shadow"]');
          }
        }
      };

      onMounted(() => {
        publishEffect();
        apply();
      });

      onBeforeUnmount(() => {
        host.effectClasses.value = [];
        host.virtualTranslate.value = false;
        host.paramOverrides.value = {};

        // Clear per-slide imperative styles and shadow children injected by apply().
        // Vue does not manage these (they are written directly to the DOM), so nothing
        // else clears them when the effect component unmounts.
        for (const el of host.slideEls.value) {
          if (!el) continue;
          el.style.transform = '';
          el.style.opacity = '';
          el.style.zIndex = '';
          el.style.transformOrigin = '';
          el.style.transitionDuration = '';
          removeShadows(el, '[class*="v-surfer-slide-shadow"]');
        }
      });

      // Re-publish and re-apply when engine state changes (slide positions, active index, etc.)
      // Using { flush: 'post' } to run after Vue has finished updating the DOM.
      watch(
        host.state,
        () => {
          publishEffect();
          apply();
        },
        { flush: 'post' },
      );

      // Re-apply when slide DOM elements change (e.g. after virtual scroll update)
      watch(
        host.slideEls,
        () => {
          apply();
        },
        { flush: 'post' },
      );

      return () => null;
    },
  });

  return { module, component };
}
