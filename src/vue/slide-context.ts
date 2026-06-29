import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from 'vue';
import type { ItemFlags } from './get-items';

/** Injection key carrying the current slide's reactive flags down its subtree. */
export const SLIDE_KEY: InjectionKey<ComputedRef<ItemFlags>> = Symbol('surferSlide');

/** The per-slide root element, rendered by <Surfer> in place of a plain `<div>` when a
 * slide has content. It provides the slide's reactive flags so a descendant can resolve
 * its own slide via useSurferSlide(). Class / style / data-* fall through to its single
 * root div, so the emitted DOM (and SSR markup) is identical to the plain div it replaces
 * — a single root element means Vue adds no hydration fragment anchors. */
export const SlideRoot = defineComponent({
  name: 'SurferSlide',
  inheritAttrs: true,
  props: {
    flags: { type: Object as PropType<ItemFlags>, required: true },
    // Function ref forwarded to the root div so <Surfer> can collect the element for
    // measurement (refs do not fall through with attrs, so it is passed explicitly).
    slideRef: { type: Function as PropType<(el: HTMLElement | null) => void>, default: undefined },
  },
  setup(props, { slots }) {
    // A single stable computed reading the live `flags` prop: when <Surfer> re-renders
    // and passes fresh flags, the prop updates and every injecting consumer reacts.
    provide(
      SLIDE_KEY,
      computed(() => props.flags),
    );
    return () => h('div', { ref: props.slideRef as never }, slots.default?.());
  },
});

/** Inside a <Surfer> <Item> slot subtree, returns the current slide's reactive flags
 * (index, realIndex, isActive, isPrev, isNext, isVisible, isFullyVisible, data).
 * The Vue-native analog of Surfer's useSurferSlide(). Throws outside a slide. */
export function useSurferSlide(): ComputedRef<ItemFlags> {
  const slide = inject(SLIDE_KEY, null);
  if (!slide) {
    throw new Error('useSurferSlide() must be called inside a <Surfer> <Item> slot.');
  }
  return slide;
}
