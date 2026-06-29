import { h, ref, defineComponent, onMounted, onBeforeUnmount } from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import { scrollbarModel } from '../../headless/scrollbar';

export interface ScrollbarConfig {
  draggable?: boolean;
  snapOnRelease?: boolean;
}

/** Frozen-ported scrollbar drag events (src/modules/scrollbar/scrollbar.ts), each carrying the
 * native pointer event. */
export interface ScrollbarEvents {
  scrollbarDragStart: PointerEvent;
  scrollbarDragMove: PointerEvent;
  scrollbarDragEnd: PointerEvent;
}

export const SCROLLBAR_EVENT_NAMES = [
  'scrollbarDragStart',
  'scrollbarDragMove',
  'scrollbarDragEnd',
] as const;

/** The scrollbar module's Api: its scoped emitter, used by the render component. */
export interface ScrollbarApi {
  emit: ScopedEmit<ScrollbarEvents>;
}

/** Module: contributes typed host.config.scrollbar + exposes the scoped emitter via its Api. */
export const ScrollbarModule = defineSurferModule<ScrollbarConfig, ScrollbarEvents>()(
  'scrollbar',
  ({ emit }): ScrollbarApi => ({ emit }),
);

const SurferScrollbar = defineComponent({
  name: 'SurferScrollbar',
  emits: [...SCROLLBAR_EVENT_NAMES],
  props: {
    draggable: { type: Boolean, default: undefined },
    snapOnRelease: { type: Boolean, default: undefined },
  },
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.scrollbar as ScrollbarConfig | undefined;

    const draggable = (): boolean => cfg?.draggable ?? props.draggable ?? true;
    const snapOnRelease = (): boolean => cfg?.snapOnRelease ?? props.snapOnRelease ?? true;

    // The module's scoped emitter (bus-routed). No-op fallback if the module is not registered.
    const sbApi = host.modules.scrollbar as ScrollbarApi | undefined;
    const emit = (sbApi?.emit ?? (() => {})) as ScopedEmit<ScrollbarEvents>;

    // Surface scrollbar events on THIS component (component separation: never on <Surfer>).
    // All three carry the native PointerEvent.
    const offs = SCROLLBAR_EVENT_NAMES.map((name) => host.on(name, (p) => ctx.emit(name, p)));
    onBeforeUnmount(() => offs.forEach((off) => off()));

    const trackRef = ref<HTMLElement | null>(null);
    const trackSize = ref(0);

    let observer: ResizeObserver | undefined;
    let boundDoc: Document | undefined;
    let activePointerId: number | null = null;

    const measure = (): void => {
      const el = trackRef.value;
      if (!el) return;
      const vertical = host.state.value.layout.direction === 'vertical';
      trackSize.value = vertical ? el.offsetHeight : el.offsetWidth;
    };

    // Physical pointer position along the track → logical progress (RTL mirrors).
    const progressFromEvent = (e: PointerEvent): number => {
      const el = trackRef.value;
      if (!el || trackSize.value <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const vertical = host.state.value.layout.direction === 'vertical';
      const rtl = host.state.value.layout.rtl;
      const pos = vertical ? e.clientY - rect.top : e.clientX - rect.left;
      let ratio = pos / trackSize.value;
      ratio = Math.max(0, Math.min(1, ratio));
      return rtl ? 1 - ratio : ratio;
    };

    const onPointerDown = (e: PointerEvent): void => {
      if (!draggable() || activePointerId !== null) return;
      activePointerId = e.pointerId;
      e.preventDefault();
      host.engine.setProgress(progressFromEvent(e));
      emit('scrollbarDragStart', e);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (e.pointerId !== activePointerId) return;
      host.engine.setProgress(progressFromEvent(e));
      emit('scrollbarDragMove', e);
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      // Frozen emits scrollbarDragEnd BEFORE the snap (scrollbar.ts:212-214), so a listener that
      // reads engine state sees the pre-snap index — match that order.
      emit('scrollbarDragEnd', e);
      if (snapOnRelease()) host.engine.slideToClosest();
    };

    onMounted(() => {
      measure();
      if (typeof ResizeObserver !== 'undefined' && trackRef.value) {
        observer = new ResizeObserver(measure);
        observer.observe(trackRef.value);
      }
      boundDoc = host.containerEl.value?.ownerDocument;
      if (boundDoc) {
        boundDoc.addEventListener('pointermove', onPointerMove);
        boundDoc.addEventListener('pointerup', onPointerUp);
        boundDoc.addEventListener('pointercancel', onPointerUp);
      }
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
      if (boundDoc) {
        boundDoc.removeEventListener('pointermove', onPointerMove);
        boundDoc.removeEventListener('pointerup', onPointerUp);
        boundDoc.removeEventListener('pointercancel', onPointerUp);
        boundDoc = undefined;
      }
    });

    return () => {
      const s = host.state.value;
      const vertical = s.layout.direction === 'vertical';
      const rtl = s.layout.rtl;
      const loop = s.layout.loop;
      const m = scrollbarModel(s, { centered: false, rtl, loop }, trackSize.value);
      // Mirror the frozen module: the thumb's transition matches the slide animation
      // duration, so it glides on animated slides and snaps instantly on drag/loop-fix
      // (duration 0). No transition while a drag is in progress.
      const td = activePointerId !== null ? 0 : s.transitionDuration;
      const transition = `transform ${td}ms ease-out, ${vertical ? 'height' : 'width'} ${td}ms ease-out`;
      const dragStyle = vertical
        ? { height: `${m.size}px`, transform: `translate3d(0px, ${m.position}px, 0)`, transition }
        : { width: `${m.size}px`, transform: `translate3d(${m.position}px, 0px, 0)`, transition };
      return h(
        'div',
        {
          ref: trackRef,
          class: [
            'v-surfer-scrollbar',
            vertical ? 'v-surfer-scrollbar-vertical' : 'v-surfer-scrollbar-horizontal',
            { 'v-surfer-scrollbar-lock': m.locked },
          ],
          style: m.hidden ? { display: 'none' } : undefined,
          onPointerdown: onPointerDown,
        },
        [h('div', { class: 'v-surfer-scrollbar-drag', style: dragStyle })],
      );
    };
  },
});

export default SurferScrollbar;
