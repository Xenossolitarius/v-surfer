import { defineComponent, onMounted, onBeforeUnmount, watch, reactive, type PropType } from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import {
  normalizeWheel,
  wheelDelta,
  WheelController,
  type WheelEventProps,
} from '../../headless/mousewheel';
import { minTranslate, maxTranslate } from '../../headless/translate';

export interface MousewheelConfig {
  enabled?: boolean;
  forceToAxis?: boolean;
  invert?: boolean;
  sensitivity?: number;
  releaseOnEdges?: boolean;
  thresholdDelta?: number | null;
  thresholdTime?: number | null;
  freeMode?: boolean;
  sticky?: boolean;
  noMousewheelClass?: string;
}

export interface MousewheelEvents {
  /** A handled wheel event; payload is the native WheelEvent (frozen emits the event). */
  scroll: WheelEvent;
}
export const MOUSEWHEEL_EVENT_NAMES = ['scroll'] as const;

export interface MousewheelApi {
  emit: ScopedEmit<MousewheelEvents>;
  enabled: boolean;
  enable(): void;
  disable(): void;
}

/** Module: contributes typed host.config.mousewheel + a reactive Api the component populates. */
export const MousewheelModule = defineSurferModule<MousewheelConfig, MousewheelEvents>()(
  'mousewheel',
  ({ emit }): MousewheelApi =>
    reactive({ emit, enabled: false, enable: () => {}, disable: () => {} }) as MousewheelApi,
);

const SurferMousewheel = defineComponent({
  name: 'SurferMousewheel',
  props: {
    enabled: { type: Boolean, default: true },
    forceToAxis: { type: Boolean, default: false },
    invert: { type: Boolean, default: false },
    sensitivity: { type: Number, default: 1 },
    releaseOnEdges: { type: Boolean, default: false },
    thresholdDelta: { type: Number as PropType<number | null>, default: null },
    thresholdTime: { type: Number as PropType<number | null>, default: null },
    freeMode: { type: Boolean, default: false },
    sticky: { type: Boolean, default: false },
    noMousewheelClass: { type: String, default: 'v-surfer-no-mousewheel' },
  },
  emits: [...MOUSEWHEEL_EVENT_NAMES],
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.mousewheel as MousewheelConfig | undefined;

    const api =
      (host.modules.mousewheel as MousewheelApi | undefined) ??
      ({ emit: () => {}, enabled: true, enable: () => {}, disable: () => {} } as MousewheelApi);
    api.enabled = cfg?.enabled ?? props.enabled ?? true;
    api.enable = () => {
      api.enabled = true;
    };
    api.disable = () => {
      api.enabled = false;
    };
    const offForwarders = MOUSEWHEEL_EVENT_NAMES.map((name) =>
      host.on(name, (p) => (p === undefined ? ctx.emit(name) : ctx.emit(name, p))),
    );

    let target: HTMLElement | undefined;
    let stickyInterval: ReturnType<typeof setInterval> | undefined;

    const controller = new WheelController({
      freeMode: cfg?.freeMode ?? props.freeMode ?? false,
      sticky: cfg?.sticky ?? props.sticky ?? false,
      releaseOnEdges: cfg?.releaseOnEdges ?? props.releaseOnEdges ?? false,
      thresholdDelta: cfg?.thresholdDelta ?? props.thresholdDelta ?? null,
      thresholdTime: cfg?.thresholdTime ?? props.thresholdTime ?? null,
      sensitivity: cfg?.sensitivity ?? props.sensitivity ?? 1,
    });

    const applySnap = (threshold: number) => host.engine.slideToClosest({ threshold });

    const applyScrub = (targetDelta: number): boolean => {
      const st = host.engine.state;
      const min = minTranslate(st.snapGrid);
      const max = maxTranslate(st.snapGrid);
      const span = max - min;
      let position = st.translate + targetDelta;
      if (position > min) position = min;
      if (position < max) position = max;
      const progress = span === 0 ? 0 : (position - min) / span;
      host.engine.setProgress(progress);
      return host.engine.state.isBeginning || host.engine.state.isEnd;
    };

    const handle = (event: WheelEvent) => {
      if (!api.enabled) return;

      const noMousewheelClass =
        cfg?.noMousewheelClass ?? props.noMousewheelClass ?? 'v-surfer-no-mousewheel';
      const t = event.target as HTMLElement | null;
      if (t && t.closest(`.${noMousewheelClass}`)) return;

      const layout = host.state.value.layout;
      const forceToAxis = cfg?.forceToAxis ?? props.forceToAxis ?? false;
      const invert = cfg?.invert ?? props.invert ?? false;

      const delta = wheelDelta(normalizeWheel(event as unknown as WheelEventProps), {
        direction: layout.direction,
        rtl: layout.rtl,
        forceToAxis,
        invert,
      });
      if (delta == null) return;

      api.emit('scroll', event);

      const st = host.engine.state;
      const out = controller.step(delta, event.timeStamp, {
        isBeginning: st.isBeginning,
        isEnd: st.isEnd,
        loop: host.state.value.layout.loop,
      });
      const releaseOnEdges = cfg?.releaseOnEdges ?? props.releaseOnEdges ?? false;
      let preventDefault = out.preventDefault;
      switch (out.effect.kind) {
        case 'slide':
          if (out.effect.dir === 'next') host.engine.slideNext();
          else host.engine.slidePrev();
          break;
        case 'scrub': {
          const atEdge = applyScrub(out.effect.targetDelta);
          if (releaseOnEdges && atEdge) preventDefault = false;
          break;
        }
        case 'snap':
          applySnap(out.effect.threshold);
          break;
        case 'none':
          break;
      }
      if (preventDefault) event.preventDefault();
    };

    const bind = () => {
      if (target) return;
      const el = host.containerEl.value;
      if (!el) return;
      target = el;
      target.addEventListener('wheel', handle as EventListener);
      stickyInterval = setInterval(() => {
        const snap = controller.due(
          typeof performance !== 'undefined' ? performance.now() : Date.now(),
        );
        if (snap && snap.kind === 'snap') applySnap(snap.threshold);
      }, 50);
    };
    const unbind = () => {
      target?.removeEventListener('wheel', handle as EventListener);
      target = undefined;
      if (stickyInterval) clearInterval(stickyInterval);
      stickyInterval = undefined;
    };

    onMounted(() => {
      if (api.enabled) bind();
    });
    watch(
      () => cfg?.enabled ?? props.enabled ?? true,
      (on) => {
        api.enabled = on;
      },
    );
    watch(
      () => api.enabled,
      (on) => (on ? bind() : unbind()),
    );
    onBeforeUnmount(() => {
      offForwarders.forEach((off) => off());
      unbind();
    });

    return () => null;
  },
});

export default SurferMousewheel;
