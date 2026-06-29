/**
 * Cube effect — standalone module (NOT using defineEffectModule factory).
 *
 * Cube is standalone because it:
 *  (a) owns the WRAPPER transform (rotation + transformOrigin + --v-surfer-cube-translate-z)
 *  (b) manages a .v-surfer-cube-shadow element (on wrapper for horizontal, container for vertical)
 *  (c) computes per-slide 90° face transforms by slide.realIndex
 *
 * This module mirrors the factory's lifecycle shape exactly:
 *  - onMounted: publish effectClasses / virtualTranslate / paramOverrides, apply styles
 *  - watch(host.state, { flush:'post' }) + watch(host.slideEls, { flush:'post' }): re-apply
 *  - onBeforeUnmount: reset fields + clean up injected elements
 *  - returns () => null (renderless)
 */

import { defineComponent, onMounted, onBeforeUnmount, watch } from 'vue';
import { defineSurferModule, injectHost } from '../module-host';
import type { EngineParamsInput } from '../../headless/types';
import {
  cubeSlideTransform,
  cubeWrapperTransform,
  cubeShadowTransform,
  cubeSlideShadowOpacity,
  type CubeParams,
} from '../../headless/effects/cube';
import { ensureShadow, removeShadows } from './shadow';
import type { EffectCtx } from './base';

const CUBE_DEFAULTS: CubeParams = {
  slideShadows: true,
  shadow: true,
  shadowOffset: 20,
  shadowScale: 0.94,
};

/** Config-only module: contributes typed host.config.cube */
export const EffectCubeModule = defineSurferModule<Partial<CubeParams>>()('cube');

const KitEffectCube = defineComponent({
  name: 'SurferEffect_cube',

  setup() {
    const host = injectHost();

    const resolveParams = (): CubeParams => {
      // oxlint-disable-next-line typescript/no-explicit-any -- config is untyped at runtime
      const configEntry = (host.config as Record<string, any>)['cube'] as
        | Partial<CubeParams>
        | undefined;
      return { ...CUBE_DEFAULTS, ...configEntry };
    };

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

    /**
     * Publish effectClasses, virtualTranslate, paramOverrides.
     * Uses shallow equality guards (mirroring the factory) to prevent spurious
     * shallowRef writes that would re-trigger watchers in a "Maximum recursive updates" loop.
     */
    const publishEffect = (): void => {
      const nextClasses = ['v-surfer-cube', 'v-surfer-3d'];
      const prevClasses = host.effectClasses.value;
      if (
        prevClasses.length !== nextClasses.length ||
        prevClasses.some((c, i) => c !== nextClasses[i])
      ) {
        host.effectClasses.value = nextClasses;
      }

      if (!host.virtualTranslate.value) {
        host.virtualTranslate.value = true;
      }

      const nextOverrides: Partial<EngineParamsInput> = {
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 0,
        resistanceRatio: 0,
        centeredSlides: false,
      };
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

    /**
     * Apply per-slide face transforms + slide shadows + wrapper transform + cube shadow.
     * IMPERATIVE writes only — never mutates any reactive state (no shallowRef writes).
     */
    const apply = (): void => {
      const ctx = buildCtx();
      const params = resolveParams();
      const slideEls = host.slideEls.value;
      const slides = host.state.value.slides;
      const wrapperEl = host.wrapperEl.value;
      const containerEl = host.containerEl.value;

      // Engine transition duration (0 during drag, `speed` on snap/next) — propagated to the
      // slides, shadows, wrapper and cube shadow so a programmatic move animates (mirrors frozen).
      const durationMs = `${ctx.state.transitionDuration}ms`;

      let wrapperRotate = 0;

      // Per-slide: face transform + slide shadows
      for (let i = 0; i < slideEls.length; i++) {
        const el = slideEls[i];
        const slide = slides[i];
        if (!el || !slide) continue;

        const { transform, wrapperRotate: slideWrapperRotate } = cubeSlideTransform(
          slide.realIndex,
          slide.progress,
          ctx,
        );

        el.style.transform = transform;
        el.style.transitionDuration = durationMs;

        // Accumulate wrapperRotate (only the "active face" slide contributes non-zero)
        if (slideWrapperRotate !== 0) {
          wrapperRotate = slideWrapperRotate;
        }

        if (params.slideShadows) {
          const isHorizontal = ctx.axis === 'horizontal';
          const { beforeOpacity, afterOpacity } = cubeSlideShadowOpacity(slide.progress);

          const beforeDir = isHorizontal ? 'left' : 'top';
          const afterDir = isHorizontal ? 'right' : 'bottom';
          const beforeClass = `v-surfer-slide-shadow-cube v-surfer-slide-shadow-${beforeDir}`;
          const afterClass = `v-surfer-slide-shadow-cube v-surfer-slide-shadow-${afterDir}`;

          // Remove stale shadows not in the current spec set
          el.querySelectorAll('[class*="v-surfer-slide-shadow"]').forEach((child) => {
            const inBefore = beforeClass.split(' ').every((c) => child.classList.contains(c));
            const inAfter = afterClass.split(' ').every((c) => child.classList.contains(c));
            if (!inBefore && !inAfter) child.remove();
          });

          const beforeEl = ensureShadow(el, beforeClass);
          beforeEl.style.opacity = String(beforeOpacity);
          beforeEl.style.transitionDuration = durationMs;
          const afterEl = ensureShadow(el, afterClass);
          afterEl.style.opacity = String(afterOpacity);
          afterEl.style.transitionDuration = durationMs;
        } else {
          removeShadows(el, '[class*="v-surfer-slide-shadow"]');
        }
      }

      // Wrapper transform + transformOrigin + CSS var
      if (wrapperEl) {
        const { transform, transformOrigin } = cubeWrapperTransform(wrapperRotate, ctx);
        wrapperEl.style.transform = transform;
        wrapperEl.style.transformOrigin = transformOrigin;
        wrapperEl.style.transitionDuration = durationMs;
        // oxlint-disable-next-line typescript/no-explicit-any -- vendor key
        (wrapperEl.style as any)['-webkit-transform-origin'] = transformOrigin;
        wrapperEl.style.setProperty('--v-surfer-cube-translate-z', '0px');
      }

      // Cube shadow element
      if (params.shadow && wrapperEl && containerEl) {
        const isHorizontal = ctx.axis === 'horizontal';
        // horizontal: shadow is child of wrapper; vertical: child of container
        const shadowParent = isHorizontal ? wrapperEl : containerEl;

        let cubeShadowEl = shadowParent.querySelector<HTMLElement>('.v-surfer-cube-shadow');
        if (!cubeShadowEl) {
          cubeShadowEl = document.createElement('div');
          cubeShadowEl.className = 'v-surfer-cube-shadow';
          shadowParent.append(cubeShadowEl);
        }

        if (isHorizontal) {
          // frozen: cubeShadowEl.style.height = ${surferWidth}px where surferWidth = containerSize
          cubeShadowEl.style.height = `${ctx.containerSize}px`;
        }

        cubeShadowEl.style.transform = cubeShadowTransform(wrapperRotate, ctx, params);
        cubeShadowEl.style.transitionDuration = durationMs;
      }
    };

    onMounted(() => {
      publishEffect();
      apply();
    });

    onBeforeUnmount(() => {
      // Reset host fields
      host.effectClasses.value = [];
      host.virtualTranslate.value = false;
      host.paramOverrides.value = {};

      // Clean up injected cube shadow element
      const wrapperEl = host.wrapperEl.value;
      const containerEl = host.containerEl.value;
      if (wrapperEl) {
        wrapperEl.querySelector('.v-surfer-cube-shadow')?.remove();
        wrapperEl.style.transform = '';
        wrapperEl.style.transformOrigin = '';
        wrapperEl.style.transitionDuration = '';
        wrapperEl.style.removeProperty('--v-surfer-cube-translate-z');
        // oxlint-disable-next-line typescript/no-explicit-any -- vendor key
        (wrapperEl.style as any)['-webkit-transform-origin'] = '';
      }
      if (containerEl) {
        containerEl.querySelector('.v-surfer-cube-shadow')?.remove();
      }

      // Clean up slide shadows and transforms
      const slideEls = host.slideEls.value;
      for (const el of slideEls) {
        if (!el) continue;
        removeShadows(el, '[class*="v-surfer-slide-shadow"]');
        el.style.transform = '';
        el.style.transitionDuration = '';
      }
    });

    // Re-publish and re-apply when engine state changes (slide positions, active index, etc.)
    // flush:'post' ensures we run after Vue has finished updating the DOM (mirroring the factory).
    watch(
      host.state,
      () => {
        publishEffect();
        apply();
      },
      { flush: 'post' },
    );

    // Re-apply when slide DOM elements change
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

export default KitEffectCube;
