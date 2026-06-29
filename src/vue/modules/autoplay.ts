import { defineComponent, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import { AutoplayController } from '../../headless/autoplay';
import type { EngineState } from '../../headless/types';

export interface AutoplayConfig {
  enabled?: boolean;
  delay?: number;
  reverseDirection?: boolean;
  stopOnLastSlide?: boolean;
  disableOnInteraction?: boolean;
  pauseOnMouseEnter?: boolean;
  waitForTransition?: boolean;
}

export interface AutoplayTimeLeft {
  timeLeft: number;
  percentage: number;
}

/** Frozen-ported autoplay events (src/modules/autoplay/autoplay.ts). autoplayTimeLeft packs
 * frozen's (timeLeft, percentage) pair into one object (the host bus is single-payload). */
export interface AutoplayEvents {
  autoplay: void;
  autoplayStart: void;
  autoplayStop: void;
  autoplayPause: void;
  autoplayResume: void;
  autoplayTimeLeft: AutoplayTimeLeft;
}

export const AUTOPLAY_EVENT_NAMES = [
  'autoplay',
  'autoplayStart',
  'autoplayStop',
  'autoplayPause',
  'autoplayResume',
  'autoplayTimeLeft',
] as const;

/** Frozen surfer.autoplay surface, reactive. `emit` is the module's scoped bus emitter (used by
 * the component); running/paused/timeLeft + the methods are populated/synced by the component. */
export interface AutoplayApi {
  emit: ScopedEmit<AutoplayEvents>;
  running: boolean;
  paused: boolean;
  timeLeft: number;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
}

/** Module: contributes typed host.config.autoplay + a reactive Api the component populates. */
export const AutoplayModule = defineSurferModule<AutoplayConfig, AutoplayEvents>()(
  'autoplay',
  ({ emit }): AutoplayApi =>
    reactive({
      emit,
      running: false,
      paused: false,
      timeLeft: 0,
      start: () => {},
      stop: () => {},
      pause: () => {},
      resume: () => {},
    }) as AutoplayApi,
);

const SurferAutoplay = defineComponent({
  name: 'SurferAutoplay',
  props: {
    enabled: { type: Boolean, default: true },
    delay: { type: Number, default: 3000 },
    reverseDirection: { type: Boolean, default: false },
    stopOnLastSlide: { type: Boolean, default: false },
    disableOnInteraction: { type: Boolean, default: false },
    pauseOnMouseEnter: { type: Boolean, default: false },
    waitForTransition: { type: Boolean, default: true },
  },
  emits: [...AUTOPLAY_EVENT_NAMES],
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.autoplay as AutoplayConfig | undefined;

    // The module's scoped, bus-routed emitter (no-op fallback if the module is not registered).
    const api = host.modules.autoplay as AutoplayApi | undefined;
    const emit = (api?.emit ?? (() => {})) as ScopedEmit<AutoplayEvents>;
    // Surface autoplay events on THIS component (component separation: never on <Surfer>).
    const offs = AUTOPLAY_EVENT_NAMES.map((name) =>
      host.on(name, (p) => (p === undefined ? ctx.emit(name) : ctx.emit(name, p))),
    );
    onBeforeUnmount(() => offs.forEach((off) => off()));

    let controller: AutoplayController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: (() => void) | undefined;
    let boundDoc: Document | undefined;
    let selfAdvancing = false;
    let pausedByTouch = false;
    let hovering = false;
    let prevActiveIndex = 0;
    let prevTouching = false;

    // Date.now() is what vi.useFakeTimers() fakes (matching the frozen module's clock),
    // so the controller's time stays consistent with the scheduled setTimeout.
    const now = () => Date.now();

    const edges = () => {
      const st = host.engine.state;
      return { isBeginning: st.isBeginning, isEnd: st.isEnd, slidesLength: st.slides.length };
    };

    const clearTimers = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = undefined;
      }
    };

    const schedule = (delay: number) => {
      clearTimers();
      timer = setTimeout(tick, Math.max(0, delay));
    };

    function tick(): void {
      if (!controller || !controller.running) return;
      const cmd = controller.fire(edges());
      if (cmd.kind === 'none') {
        controller.stop();
        stopProgress();
        emit('autoplayStop');
        syncApi();
        if (api) api.timeLeft = 0;
        clearTimers();
        return;
      }
      selfAdvancing = true;
      if (cmd.kind === 'next') host.next();
      else if (cmd.kind === 'prev') host.prev();
      else host.goTo(cmd.index);
      selfAdvancing = false;
      emit('autoplay');
      const td = host.engine.state.transitionDuration;
      const waitForTransition = cfg?.waitForTransition ?? props.waitForTransition ?? true;
      if (waitForTransition && td > 0) {
        controller.pause(now(), { reset: true });
        syncApi(); // controller is paused during the transition window — mirror it to the Api
        transitionTimer = setTimeout(() => {
          if (!controller || !controller.running || !controller.paused) return;
          if (hovering || host.engine.state.touching) return;
          const d = controller.resume(now());
          if (d != null) schedule(d);
          syncApi(); // resumed after the transition window
        }, td);
      } else {
        schedule(controller.armNext(now()));
      }
    }

    const startProgress = () => {
      stopProgress();
      const delay = cfg?.delay ?? props.delay ?? 3000;
      progressInterval = setInterval(() => {
        if (!controller || !controller.running) return;
        const tl = controller.timeLeft(now());
        emit('autoplayTimeLeft', { timeLeft: tl, percentage: delay ? tl / delay : 0 });
        if (api) api.timeLeft = tl;
      }, 50);
    };
    const stopProgress = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = undefined;
      }
    };

    // Mirror the controller's running/paused into the reactive Api.
    const syncApi = (): void => {
      if (!api) return;
      api.running = controller?.running ?? false;
      api.paused = controller?.paused ?? false;
    };

    const begin = () => {
      const delay = cfg?.delay ?? props.delay ?? 3000;
      const layout = host.state.value.layout;
      controller = new AutoplayController({
        delay,
        reverseDirection: cfg?.reverseDirection ?? props.reverseDirection ?? false,
        stopOnLastSlide: cfg?.stopOnLastSlide ?? props.stopOnLastSlide ?? false,
        loop: layout.loop,
        rewind: layout.rewind,
        disableOnInteraction: cfg?.disableOnInteraction ?? props.disableOnInteraction ?? false,
      });
      const st = host.engine.state;
      prevActiveIndex = st.activeIndex;
      prevTouching = st.touching;
      schedule(controller.start(now()));
      startProgress();
      emit('autoplayStart');
      syncApi();
      // Seed timeLeft to the full remaining immediately (the 50ms progress interval only ticks
      // from t=50ms onward, so without this the Api would report a stale 0 right after start).
      if (api) api.timeLeft = controller.timeLeft(now());
    };

    const end = () => {
      controller?.stop();
      clearTimers();
      stopProgress();
      syncApi();
      if (api) api.timeLeft = 0;
    };

    const interaction = (reset: boolean, byTouch: boolean) => {
      if (!controller || !controller.running) return;
      const result = controller.interaction(now(), { reset });
      clearTimers();
      if (result === 'stop') {
        stopProgress();
        emit('autoplayStop');
      } else {
        pausedByTouch = byTouch;
        emit('autoplayPause');
      }
      syncApi();
    };

    const pause = () => {
      if (!controller || !controller.running || controller.paused) return;
      controller.pause(now());
      clearTimers();
      emit('autoplayPause');
      syncApi();
    };

    const resume = () => {
      if (!controller || !controller.running || !controller.paused) return;
      const d = controller.resume(now());
      if (d == null) return;
      pausedByTouch = false;
      schedule(d);
      emit('autoplayResume');
      syncApi();
    };

    // Expose the frozen surfer.autoplay control surface on host.modules.autoplay. start() no-ops
    // when already running; stop() emits autoplayStop (the internal end() — also the unmount path —
    // stays silent).
    if (api) {
      api.start = (): void => {
        if (!controller?.running) begin();
      };
      api.stop = (): void => {
        const was = !!controller?.running;
        end();
        if (was) emit('autoplayStop');
        syncApi();
      };
      api.pause = (): void => pause();
      api.resume = (): void => resume();
    }

    const onSnapshot = (st: EngineState<unknown>) => {
      if (!controller || !controller.running) {
        prevActiveIndex = st.activeIndex;
        prevTouching = st.touching;
        return;
      }
      if (st.touching && !prevTouching) {
        interaction(false, true);
      } else if (!st.touching && prevTouching) {
        if (pausedByTouch && !hovering) resume();
      } else if (st.activeIndex !== prevActiveIndex && !selfAdvancing && !st.touching) {
        interaction(true, false);
      }
      prevActiveIndex = st.activeIndex;
      prevTouching = st.touching;
    };

    const onVisibility = () => {
      if (!boundDoc) return;
      if (boundDoc.visibilityState === 'hidden') pause();
      else if (boundDoc.visibilityState === 'visible') resume();
    };
    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      pause();
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering = false;
      if (host.engine.state.touching) return;
      resume();
    };

    onMounted(() => {
      unsubscribe = host.engine.subscribe(onSnapshot);
      const hostEl = host.containerEl.value;
      boundDoc = hostEl?.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
      boundDoc?.addEventListener('visibilitychange', onVisibility);
      const pauseOnMouseEnter = cfg?.pauseOnMouseEnter ?? props.pauseOnMouseEnter ?? false;
      if (pauseOnMouseEnter && hostEl) {
        hostEl.addEventListener('pointerenter', onPointerEnter as EventListener);
        hostEl.addEventListener('pointerleave', onPointerLeave as EventListener);
      }
      const enabled = cfg?.enabled ?? props.enabled ?? true;
      if (enabled) begin();
    });

    watch(
      () => cfg?.enabled ?? props.enabled ?? true,
      (on) => (on ? begin() : end()),
    );

    onBeforeUnmount(() => {
      end();
      unsubscribe?.();
      boundDoc?.removeEventListener('visibilitychange', onVisibility);
      const hostEl = host.containerEl.value;
      if (hostEl) {
        hostEl.removeEventListener('pointerenter', onPointerEnter as EventListener);
        hostEl.removeEventListener('pointerleave', onPointerLeave as EventListener);
      }
    });

    return () => null;
  },
});

export default SurferAutoplay;
