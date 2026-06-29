import { h, defineComponent, computed, onBeforeUnmount, ref, watch } from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import {
  navigationModel,
  navigationPrevClasses,
  navigationNextClasses,
} from '../../headless/navigation';

export interface NavigationConfig {
  enabled?: boolean;
  prevText?: string;
  nextText?: string;
  hideOnClick?: boolean; // default false (frozen default)
  hiddenClass?: string; // default 'v-surfer-button-hidden' (frozen default)
}

/** Frozen-ported navigation events (src/modules/navigation/navigation.ts). */
export interface NavigationEvents {
  navigationNext: void;
  navigationPrev: void;
  navigationShow: void;
  navigationHide: void;
}

export const NAVIGATION_EVENT_NAMES = [
  'navigationNext',
  'navigationPrev',
  'navigationShow',
  'navigationHide',
] as const;

/** The navigation module's Api: its scoped emitter, used by the render component. */
export interface NavigationApi {
  emit: ScopedEmit<NavigationEvents>;
}

/** Module: contributes typed host.config.navigation + exposes the scoped emitter via its Api. */
export const NavigationModule = defineSurferModule<NavigationConfig, NavigationEvents>()(
  'navigation',
  ({ emit }): NavigationApi => ({ emit }),
);

const SurferNavigation = defineComponent({
  name: 'SurferNavigation',
  emits: [...NAVIGATION_EVENT_NAMES],
  props: {
    prevText: { type: String, default: undefined },
    nextText: { type: String, default: undefined },
  },
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.navigation as NavigationConfig | undefined;
    // Props write through to host.config.navigation (POC pattern).
    if (cfg) {
      if (props.prevText !== undefined) cfg.prevText = props.prevText;
      if (props.nextText !== undefined) cfg.nextText = props.nextText;
    }

    // The module's scoped emitter (bus-routed). No-op fallback if the module is not registered.
    const navApi = host.modules.navigation as NavigationApi | undefined;
    const emit = (navApi?.emit ?? (() => {})) as ScopedEmit<NavigationEvents>;

    // Surface the nav events on THIS component (component separation: never on <Surfer>).
    const offs = NAVIGATION_EVENT_NAMES.map((name) => host.on(name, () => ctx.emit(name)));
    onBeforeUnmount(() => offs.forEach((off) => off()));

    // loop/rewind come from engine state so buttons stay enabled under loop (frozen returns
    // early under loop) — matching navigationModel.
    const model = computed(() => {
      const s = host.state.value;
      return navigationModel(s, { loop: s.layout.loop, rewind: s.layout.rewind });
    });

    // hideOnClick: a click on the surfer (not on a nav button, not on a clickable pagination)
    // toggles button visibility and emits navigationShow/Hide on the flip (frozen navigation.ts).
    const hidden = ref(false);
    const hiddenClass = (): string => cfg?.hiddenClass ?? 'v-surfer-button-hidden';
    const prevClasses = computed(() => {
      const c = navigationPrevClasses(model.value);
      if (hidden.value) c.push(hiddenClass());
      return c;
    });
    const nextClasses = computed(() => {
      const c = navigationNextClasses(model.value);
      if (hidden.value) c.push(hiddenClass());
      return c;
    });

    watch(
      () => host.containerEl.value,
      (el, _prev, onCleanup) => {
        if (!el) return;
        const onContainerClick = (e: MouseEvent): void => {
          if (!cfg?.hideOnClick) return;
          const t = e.target;
          if (!(t instanceof Element)) return;
          if (t.closest('.v-surfer-button-prev, .v-surfer-button-next')) return; // a nav button
          if (t.closest('.v-surfer-pagination')) return; // clickable pagination
          if (hidden.value) emit('navigationShow');
          else emit('navigationHide');
          hidden.value = !hidden.value;
        };
        el.addEventListener('click', onContainerClick);
        onCleanup(() => el.removeEventListener('click', onContainerClick));
      },
      { immediate: true },
    );

    // Frozen edge guard (navigation.ts:80/86): no slide and no event at the disabled edge.
    const onPrev = (): void => {
      if (model.value.prevDisabled) return;
      host.prev();
      emit('navigationPrev');
    };
    const onNext = (): void => {
      if (model.value.nextDisabled) return;
      host.next();
      emit('navigationNext');
    };

    return () =>
      h('div', { class: 'v-surfer-navigation' }, [
        h(
          'button',
          { class: prevClasses.value, type: 'button', onClick: onPrev },
          cfg?.prevText ?? props.prevText ?? '',
        ),
        h(
          'button',
          { class: nextClasses.value, type: 'button', onClick: onNext },
          cfg?.nextText ?? props.nextText ?? '',
        ),
      ]);
  },
});

export default SurferNavigation;
