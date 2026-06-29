import type { EngineState } from './types';
import type { SlideFlags } from './slide-state';

// The per-slide flags the slide classes derive from live in slide-state.ts (the
// computeSlideFlags return type); ComputedSlide is a structural superset. Re-export
// so consumers can import SlideFlags from either module.
export type { SlideFlags };

/** Per-slide class names (frozen `updateSlidesClasses` parity). */
export function slideClassNames(flags: SlideFlags): string[] {
  const c = ['v-surfer-slide'];
  if (flags.isActive) c.push('v-surfer-slide-active');
  if (flags.isPrev) c.push('v-surfer-slide-prev');
  if (flags.isNext) c.push('v-surfer-slide-next');
  if (flags.isVisible) c.push('v-surfer-slide-visible');
  if (flags.isFullyVisible) c.push('v-surfer-slide-fully-visible');
  return c;
}

/**
 * Container class names (frozen `addClasses` parity, headless subset). Reads only
 * `state.layout`, so it is correct before geometry (SSR-safe). Order mirrors
 * frozen's: direction, free-mode, autoheight, rtl, css-mode, centered, virtual.
 */
export function surferContainerClassNames(state: EngineState<unknown>): string[] {
  const { direction, rtl, cssMode, centeredSlides, freeMode, virtual, autoHeight } = state.layout;
  const c = ['v-surfer', `v-surfer-${direction}`];
  if (freeMode) c.push('v-surfer-free-mode');
  if (autoHeight) c.push('v-surfer-autoheight');
  if (rtl) c.push('v-surfer-rtl');
  if (cssMode) c.push('v-surfer-css-mode');
  if (cssMode && centeredSlides) c.push('v-surfer-centered');
  if (virtual) c.push('v-surfer-virtual');
  return c;
}
