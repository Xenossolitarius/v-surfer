import {
  h,
  watch,
  defineComponent,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  nextTick,
  provide,
  type PropType,
  type VNode,
} from 'vue';
import {
  useSurferHost,
  HOST_KEY,
  type ModuleHost,
  type ModuleDef,
  type ReactiveEngineParams,
} from './module-host';
import { getItems, type HarvestedItem, type ItemFlags } from './get-items';
import { SlideRoot } from './slide-context';
import { renderTransform, type Direction } from '../headless/direction';
import { slideClassNames, surferContainerClassNames } from '../headless/classes';
import { autoHeightTargetIndices } from '../headless/auto-height';
import { CORE_EVENT_NAMES } from './core-events';
import type {
  EngineParamsInput,
  LoopInput,
  FreeModeInput,
  VirtualInput,
  CenteredInput,
  GroupInput,
  TouchInput,
} from '../headless/types';

/** DOM-glue group sugar (not engine params) — the object form of the `noSwiping` family. */
export interface NoSwipingInput {
  enabled?: boolean;
  class?: string;
  selector?: string;
}
/** DOM-glue group sugar (not engine params) — the object form of the `preventClicks` family. */
export interface PreventClicksInput {
  enabled?: boolean;
  propagation?: boolean;
}

// oxlint-disable-next-line typescript/no-explicit-any -- module list is heterogeneous; consumers get typing via useSurferHost when they build the host themselves.
type AnyModuleList = readonly ModuleDef<string, any, any, any>[];

// Every flat engine param Surfer forwards to the host, in one place. They are
// declared as props so Vue consumes them (an undeclared prop would fall through
// onto the container as a DOM attribute) and setup() forwards each to the engine
// via a reactive getter. `default: undefined` keeps an unset prop out of the param
// payload (useSurferHost omits undefined), so the engine's own defaults apply —
// the same convention the original twelve props used. `breakpoints` is intentionally
// excluded: it is not a pure pass-through (the engine needs runtime dimension feeding
// via setBreakpointDimensions, which the kit does not wire), so exposing it as a prop
// would be a non-functional surface. ENGINE_KEYS below is derived from these keys.
const ENGINE_PROPS = {
  slidesPerView: { type: [Number, String] as PropType<number | 'auto'>, default: undefined },
  direction: { type: String as PropType<'horizontal' | 'vertical'>, default: undefined },
  rtl: { type: Boolean, default: undefined },
  loop: { type: [Boolean, Object] as PropType<boolean | LoopInput>, default: undefined },
  rewind: { type: Boolean, default: undefined },
  loopAdditionalSlides: { type: Number, default: undefined },
  virtual: { type: [Boolean, Object] as PropType<boolean | VirtualInput>, default: undefined },
  addSlidesBefore: { type: Number, default: undefined },
  addSlidesAfter: { type: Number, default: undefined },
  virtualAutoSlidesPerView: { type: Number, default: undefined },
  spaceBetween: { type: Number, default: undefined },
  speed: { type: Number, default: undefined },
  initialSlide: { type: Number, default: undefined },
  slidesPerGroup: { type: Number, default: undefined },
  slidesPerGroupSkip: { type: Number, default: undefined },
  slidesPerGroupAuto: { type: Boolean, default: undefined },
  centeredSlides: { type: Boolean, default: undefined },
  centerInsufficientSlides: { type: Boolean, default: undefined },
  centeredSlidesBounds: { type: Boolean, default: undefined },
  loopPreventsSliding: { type: Boolean, default: undefined },
  roundLengths: { type: Boolean, default: undefined },
  autoHeight: { type: Boolean, default: undefined },
  freeMode: { type: [Boolean, Object] as PropType<boolean | FreeModeInput>, default: undefined },
  freeModeMomentum: { type: Boolean, default: undefined },
  freeModeMomentumRatio: { type: Number, default: undefined },
  freeModeMomentumVelocityRatio: { type: Number, default: undefined },
  freeModeMomentumBounce: { type: Boolean, default: undefined },
  freeModeMomentumBounceRatio: { type: Number, default: undefined },
  freeModeSticky: { type: Boolean, default: undefined },
  freeModeMinimumVelocity: { type: Number, default: undefined },
  normalizeSlideIndex: { type: Boolean, default: undefined },
  allowTouchMove: { type: Boolean, default: undefined },
  allowSlideNext: { type: Boolean, default: undefined },
  allowSlidePrev: { type: Boolean, default: undefined },
  simulateTouch: { type: Boolean, default: undefined },
  touchRatio: { type: Number, default: undefined },
  touchAngle: { type: Number, default: undefined },
  touchReleaseOnEdges: { type: Boolean, default: undefined },
  threshold: { type: Number, default: undefined },
  resistance: { type: Boolean, default: undefined },
  resistanceRatio: { type: Number, default: undefined },
  followFinger: { type: Boolean, default: undefined },
  shortSwipes: { type: Boolean, default: undefined },
  longSwipes: { type: Boolean, default: undefined },
  longSwipesMs: { type: Number, default: undefined },
  longSwipesRatio: { type: Number, default: undefined },
  oneWayMovement: { type: Boolean, default: undefined },
  cssMode: { type: Boolean, default: undefined },
};

const Surfer = defineComponent({
  name: 'Surfer',
  emits: [...CORE_EVENT_NAMES],
  props: {
    host: { type: Object as PropType<ModuleHost>, default: undefined },
    modules: { type: Array as PropType<AnyModuleList>, default: undefined },
    config: { type: Object as PropType<Record<string, object>>, default: undefined },
    tag: { type: String, default: 'div' },
    wrapperTag: { type: String, default: 'div' },
    onReady: { type: Function, default: undefined },
    grabCursor: { type: Boolean, default: false },
    // DOM-glue, not an engine param: the engine is DOM-free and never sees e.target /
    // document.activeElement. A CSS selector for controls a gesture must not hijack —
    // dragging on a focused match drives the control instead of swiping. Mirrors the
    // frozen core `focusableElements` default.
    focusableElements: {
      type: String,
      default: 'input, select, option, textarea, button, video, label',
    },
    // DOM-glue group sugar. Accept either the flat boolean (back-compat) or an object
    // ({ enabled, class, selector } / { enabled, propagation }); the object is resolved at
    // event time and an explicit flat sibling prop (noSwipingClass etc.) still wins.
    noSwiping: { type: [Boolean, Object] as PropType<boolean | NoSwipingInput>, default: true },
    noSwipingClass: { type: String, default: 'v-surfer-no-swiping' },
    noSwipingSelector: { type: String, default: '' },
    preventClicks: {
      type: [Boolean, Object] as PropType<boolean | PreventClicksInput>,
      default: true,
    },
    preventClicksPropagation: { type: Boolean, default: true },
    breakpoints: {
      type: Object as PropType<EngineParamsInput['breakpoints']>,
      default: undefined,
    },
    breakpointsBase: { type: String as PropType<'window' | 'container'>, default: 'container' },
    height: { type: Number as PropType<number | null>, default: null },
    width: { type: Number as PropType<number | null>, default: null },
    resizeObserver: { type: Boolean, default: true },
    touchMoveStopPropagation: { type: Boolean, default: false },
    touchStartPreventDefault: { type: Boolean, default: true },
    touchStartForcePreventDefault: { type: Boolean, default: false },
    // Engine-param group sugar with no flat ENGINE_PROPS entry of their own (their flat
    // fields are centeredSlides / slidesPerGroup* / allowTouchMove etc.). Forwarded to the
    // host as objects; the engine flattens them via normalizeParams (flat sibling wins).
    centered: {
      type: [Boolean, Object] as PropType<boolean | CenteredInput>,
      default: undefined,
    },
    group: { type: Object as PropType<GroupInput>, default: undefined },
    touch: { type: Object as PropType<TouchInput>, default: undefined },
    ...ENGINE_PROPS,
  },
  setup(props, ctx) {
    const { slots } = ctx;
    const emit = ctx.emit as (event: string, ...args: unknown[]) => void;
    // Derived from the single ENGINE_PROPS source so a newly-added param prop is
    // forwarded automatically — no second list to keep in sync.
    const ENGINE_KEYS = Object.keys(ENGINE_PROPS) as (keyof EngineParamsInput)[];
    // Pass params to the host as getters so it reconfigures the engine itself when
    // a param prop changes — no engine.setParams wiring lives here.
    const reactiveParams: ReactiveEngineParams = {};
    for (const k of ENGINE_KEYS) {
      (reactiveParams as Record<string, () => unknown>)[k] = () => (props as EngineParamsInput)[k];
    }
    // breakpoints is an object param (not a flat ENGINE_PROPS entry); forward it too.
    (reactiveParams as Record<string, () => unknown>).breakpoints = () => props.breakpoints;
    // centered/group/touch are group-only param keys (no flat ENGINE_PROPS entry); forward
    // each so the engine's normalizeParams flattens it. undefined entries are omitted by the host.
    (reactiveParams as Record<string, () => unknown>).centered = () => props.centered;
    (reactiveParams as Record<string, () => unknown>).group = () => props.group;
    (reactiveParams as Record<string, () => unknown>).touch = () => props.touch;

    const host =
      props.host ??
      useSurferHost({ ...reactiveParams, modules: props.modules, config: props.config });
    provide(HOST_KEY, host);
    const {
      engine,
      state,
      containerEl,
      wrapperEl,
      slideEls,
      virtualTranslate,
      effectClasses,
      coreEmit,
      enabled,
    } = host;

    // Forward only CORE events from the host bus to Vue emit (engine events + DOM touch/resize
    // both land on the bus). Module events are NOT forwarded here — component separation.
    const offForwarders = CORE_EVENT_NAMES.map((name) =>
      host.on(name, (payload) => (payload === undefined ? emit(name) : emit(name, payload))),
    );

    // Harvested <Item> templates. A PLAIN holder (not a ref): it is written from
    // inside the render fn — where the slot IS invoked, so Vue tracks the slot's
    // reactive deps (e.g. a v-for list) and produces fresh vnodes — without the
    // during-render engine mutation that would loop. The engine push happens from
    // onUpdated/onMounted instead (mirrors frozen src/vue/surfer.ts's slidesRef +
    // onUpdated->updateSurfer). Invoking the slot in a watchEffect (outside render)
    // is what Vue warns against, so we do not.
    const harvested: { value: HarvestedItem[] } = { value: [] };

    // Push the harvested slide data into the engine, but only when it actually
    // changed (by length + per-item identity) — an unconditional push would loop:
    // setSlides commits -> re-render -> onUpdated -> push -> ...
    let lastData: unknown[] = [];
    const pushSlides = (): void => {
      const data = harvested.value.map((it) => it.data);
      if (data.length === lastData.length && data.every((d, i) => d === lastData[i])) return;
      lastData = data;
      engine.setSlides(data.map((d) => ({ data: d })));
    };

    // SSR + first-paint seed: harvest the slot once here so the server render (and
    // the client's pre-measurement render) has slides. setup runs on both server and
    // client → hydration-stable. Dynamic updates still flow through the render-time
    // harvest + onUpdated. NOTE: invoking the slot in setup logs Vue's "Slot invoked
    // outside of the render function" dev warning for this one read — accepted as the
    // cost of SSR seeding (the frozen Vue Surfer does the same in getChildren).
    harvested.value = getItems(slots.default?.() ?? []).items;
    pushSlides();

    let observer: ResizeObserver | undefined;
    let windowResizeBound = false;
    let activePointerId: number | null = null;
    let boundDoc: Document | undefined;
    let firstMoveEmitted = false;
    let lastTapTime = 0;
    let lastTapTarget: EventTarget | null = null;
    let pointerDownTarget: EventTarget | null = null;

    // breakpointsBase: 'window' matches breakpoint keys against the viewport width
    // (frozen's default behavior, via matchMedia min-width); 'container' (the kit default)
    // matches against the surfer container's width. Geometry always uses the container.
    const breakpointDims = (el: HTMLElement): { width: number; height: number } =>
      props.breakpointsBase === 'window' && typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: el.clientWidth, height: el.clientHeight };

    const measure = (): void => {
      const el = containerEl.value;
      if (!el) return;
      const vertical = state.value.layout.direction === 'vertical';
      const size =
        (vertical ? (props.height ?? el.clientHeight) : (props.width ?? el.clientWidth)) ?? 0;
      if (size <= 0) return;
      if (props.breakpoints) {
        engine.setBreakpointDimensions(breakpointDims(el));
      }
      if (props.slidesPerView === 'auto') {
        // setGeometry expects sizes keyed by REAL slide index. slideEls is in layout
        // order, so place each measured size at its slide's realIndex.
        const order = engine.state.slides;
        const sizes = Array.from<number>({ length: order.length }).fill(0);
        slideEls.value.forEach((s, i) => {
          const realIdx = order[i]?.realIndex;
          if (s && realIdx !== undefined)
            sizes[realIdx] = vertical ? s.offsetHeight : s.offsetWidth;
        });
        engine.setGeometry({ containerSize: size, sizes });
      } else {
        engine.setGeometry({ containerSize: size });
      }
    };

    // measure() triggered by a resize source (RO / window) — bracket it with events.
    const measureFromResize = (): void => {
      coreEmit('beforeResize');
      measure();
      coreEmit('resize');
    };

    const onWindowResize = (): void => measureFromResize();

    // Keep the window 'resize' listener attached only while breakpointsBase is 'window'
    // (a fixed-width container won't trigger the container ResizeObserver on a viewport
    // change). Idempotent + balanced so a runtime base switch can't double-bind/leak.
    const syncWindowResize = (): void => {
      const want =
        typeof window !== 'undefined' &&
        (props.breakpointsBase === 'window' || props.resizeObserver === false);
      if (want && !windowResizeBound) {
        window.addEventListener('resize', onWindowResize);
        windowResizeBound = true;
      } else if (!want && windowResizeBound) {
        window.removeEventListener('resize', onWindowResize);
        windowResizeBound = false;
      }
    };

    const applyGrabCursor = (moving: boolean): void => {
      const el = wrapperEl.value;
      if (!el) return;
      if (!props.grabCursor || props.cssMode) {
        el.style.cursor = '';
        return;
      }
      el.style.cursor = moving ? 'grabbing' : 'grab';
    };

    // height / width: force fixed container dimensions (px). The kit writes the container
    // style directly (so the forced size also drives the measured clientWidth/Height);
    // frozen's updateSize only reads params.width/height as the geometry size.
    const applyForcedSize = (): void => {
      const el = containerEl.value;
      if (!el) return;
      el.style.height = props.height != null ? `${props.height}px` : '';
      el.style.width = props.width != null ? `${props.width}px` : '';
    };

    // autoHeight: size the wrapper to the tallest in-view slide. Height is written
    // imperatively (the render fn never sets wrapper height, so this persists across
    // patches); the v-surfer-autoheight CSS adds `height` to transition-property, so the
    // render's existing transitionDuration animates it (faithful to frozen, whose
    // no-arg updateAutoHeight() relies on the slide transition already in place).
    const applyAutoHeight = (): void => {
      const el = wrapperEl.value;
      if (!el) return;
      if (!props.autoHeight) {
        el.style.height = '';
        return;
      }
      const s = state.value;
      // Under virtual, slideEls holds only the rendered window (slides.slice(lo, hi+1))
      // in window-relative order, so a full-list position must be shifted by the window
      // start before indexing slideEls. lo === 0 for the non-virtual case.
      const lo = engine.params.virtual && s.virtual ? Math.max(0, s.virtual.from) : 0;
      const indices = autoHeightTargetIndices(s);
      const els = slideEls.value;
      let max = 0;
      for (const pos of indices) {
        const slideEl = els[pos - lo];
        if (slideEl && slideEl.offsetHeight > max) max = slideEl.offsetHeight;
      }
      el.style.height = `${max}px`;
    };

    // focusableElements: does `el` match the configured focusable selector? Empty
    // selector disables the feature (el.matches('') throws, so guard it). Non-Element
    // targets (document, etc.) never match.
    const matchesFocusable = (el: EventTarget | null): boolean => {
      const sel = props.focusableElements;
      return !!sel && el instanceof Element && el.matches(sel);
    };

    // Resolve the noSwiping / preventClicks DOM-glue groups at event time. Each accepts the
    // flat boolean (back-compat) or an object; a bare object means enabled. Unlike the engine
    // groups (whose flat siblings default to undefined, so flat-wins is unambiguous), the flat
    // siblings here carry real defaults (noSwipingClass = 'v-surfer-no-swiping', propagation =
    // true), so an object field WINS when present and otherwise falls back to the flat sibling.
    const resolveNoSwiping = (): { enabled: boolean; cls: string; sel: string } => {
      const ns = props.noSwiping;
      if (typeof ns === 'object' && ns !== null) {
        return {
          enabled: ns.enabled ?? true,
          cls: ns.class ?? props.noSwipingClass,
          sel: ns.selector ?? props.noSwipingSelector,
        };
      }
      return { enabled: ns, cls: props.noSwipingClass, sel: props.noSwipingSelector };
    };
    const resolvePreventClicks = (): { enabled: boolean; propagation: boolean } => {
      const pc = props.preventClicks;
      if (typeof pc === 'object' && pc !== null) {
        return {
          enabled: pc.enabled ?? true,
          propagation: pc.propagation ?? props.preventClicksPropagation,
        };
      }
      return { enabled: pc, propagation: props.preventClicksPropagation };
    };

    const onPointerDown = (e: PointerEvent): void => {
      // enabled gate (frozen surfer.enabled): a disabled surfer does not start drags.
      if (enabled.value === false) return;
      if (activePointerId !== null) return;
      // simulateTouch (port of onTouchStart's mouse gate): when off, mouse-initiated
      // drags are ignored. Read the engine's RESOLVED param (a real boolean, defaults +
      // grouped `touch.simulate` applied) rather than the raw prop, which is undefined
      // when the value arrives via the `touch` group.
      if (e.pointerType === 'mouse' && !engine.params.simulateTouch) return;
      // noSwiping (port of onTouchStart.ts:95-118): a gesture beginning inside a matched
      // element does not swipe. noSwipingSelector wins over the class form.
      const ns = resolveNoSwiping();
      if (ns.enabled) {
        const sel = ns.sel || (ns.cls ? `.${ns.cls}` : '');
        if (sel && e.target instanceof Element && e.target.closest(sel)) return;
      }
      // Never start a drag that begins on a <select> (its native picker owns the gesture)
      // or on a focusable control that is already focused (let the user interact with it).
      // Mirrors core onTouchStart: focusable target → no preventDefault; SELECT → isTouched
      // false. When enabled, preventDefault suppresses native text-selection / image-drag.
      const target = e.target;
      if (
        matchesFocusable(target) &&
        ((target as Element).nodeName === 'SELECT' || target === boundDoc?.activeElement)
      ) {
        return;
      }
      // touchStartPreventDefault / touchStartForcePreventDefault (port of onTouchStart.ts:152-177):
      // suppress native text-selection / image-drag while swiping. Skipped for focusable targets
      // (so native focus works) unless force is on, and never for contentEditable. NOTE: the
      // focusableElements guard above already returns for <select>/already-focused targets, so
      // force won't fire on those (a rare combo); the common path is exact.
      const shouldPreventDefault =
        !matchesFocusable(target) &&
        engine.params.allowTouchMove &&
        props.touchStartPreventDefault !== false;
      if (
        (props.touchStartForcePreventDefault === true || shouldPreventDefault) &&
        !(target instanceof HTMLElement && target.isContentEditable)
      ) {
        e.preventDefault();
      }
      activePointerId = e.pointerId;
      pointerDownTarget = e.target;
      engine.pointerStart({ x: e.clientX, y: e.clientY, time: e.timeStamp });
      firstMoveEmitted = false;
      coreEmit('touchStart', e);
      applyGrabCursor(true);
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (e.pointerId !== activePointerId) return;
      // touchMoveStopPropagation: stop propagation of the move. Placed right after the
      // pointerId guard (earlier than the oracle's onTouchMove.ts:168, which calls it after
      // scroll-detection); the !nested clause is moot — nested surfer instances are unsupported here.
      if (props.touchMoveStopPropagation) e.stopPropagation();
      // A gesture that focused a focusable control (e.g. the pointerdown focused an input)
      // should drive that control, not swipe — swallow the move. Mirrors core onTouchMove's
      // activeElement guard (the "swiping disabled on focused elements" behavior).
      const active = boundDoc?.activeElement ?? null;
      if (active === e.target && matchesFocusable(active)) return;
      coreEmit('touchMove', e);
      const outcome = engine.pointerMove({ x: e.clientX, y: e.clientY, time: e.timeStamp });
      if (outcome.scrolling) {
        coreEmit('touchMoveOpposite', e);
      } else if (outcome.moved) {
        if (!firstMoveEmitted) {
          firstMoveEmitted = true;
          coreEmit('sliderFirstMove', e);
        }
        coreEmit('sliderMove', e);
      }
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      engine.pointerEnd({ x: e.clientX, y: e.clientY, time: e.timeStamp });
      coreEmit('touchEnd', e);
      if (state.value.allowClick) {
        // clickedSlide/clickedIndex (frozen updateClickedSlide): map the tapped element to its slide.
        // Use pointerDownTarget (captured at pointerdown) — pointerup fires on document, not the slide.
        const clickedEl = (
          pointerDownTarget instanceof Element ? pointerDownTarget.closest('.v-surfer-slide') : null
        ) as HTMLElement | null;
        const clickedPos = clickedEl ? slideEls.value.indexOf(clickedEl) : -1;
        host.clickedSlide.value = clickedPos >= 0 ? clickedEl : null;
        host.clickedIndex.value =
          clickedPos >= 0 ? (state.value.slides[clickedPos]?.index ?? -1) : -1;
        coreEmit('tap', e);
        coreEmit('click', e);
        if (e.timeStamp - lastTapTime < 300 && lastTapTarget === e.target) {
          coreEmit('doubleTap', e);
          coreEmit('doubleClick', e);
          lastTapTime = 0;
          lastTapTarget = null;
        } else {
          lastTapTime = e.timeStamp;
          lastTapTarget = e.target;
        }
      }
      applyGrabCursor(false);
    };
    // preventClicks (port of events/onClick.ts): a click synthesized by the browser at the
    // end of a swipe is suppressed. allowClick/animating come from the engine snapshot.
    const onContainerClick = (e: MouseEvent): void => {
      if (state.value.allowClick) return;
      const pc = resolvePreventClicks();
      if (pc.enabled) e.preventDefault();
      if (pc.propagation && state.value.animating) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    const onWrapperTransitionEnd = (e: TransitionEvent): void => {
      if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
      engine.onTransitionEnd();
    };

    // cssMode feedback: native scroll position → engine (port of core onScroll).
    const onWrapperScroll = (): void => {
      const el = wrapperEl.value;
      if (!el) return;
      const vertical = state.value.layout.direction === 'vertical';
      engine.setTranslate(-(vertical ? el.scrollTop : el.scrollLeft));
    };

    // cssMode: when a programmatic move emits a scroll target, scroll the wrapper there.
    watch(
      () => state.value.scrollSnapTarget,
      (target) => {
        if (!props.cssMode || !target) return;
        const el = wrapperEl.value;
        if (!el) return;
        const vertical = state.value.layout.direction === 'vertical';
        const pos = props.rtl ? target.translate : -target.translate;
        const side = vertical ? 'scrollTop' : 'scrollLeft';
        if (target.speed === 0) {
          el[side] = pos;
        } else {
          el.scrollTo({ [vertical ? 'top' : 'left']: pos, behavior: 'smooth' });
        }
      },
    );

    // The engine reconfigure (setParams) now lives in useSurferHost (driven by the
    // reactive param getters above). We still re-measure on param change, since a
    // direction flip changes which container dimension is the size, and auto-size
    // depends on slide box sizes.
    watch(
      () => ENGINE_KEYS.map((k) => (props as EngineParamsInput)[k]),
      () => nextTick(() => measure()),
    );
    // changeDirection drives the axis via a param override (not a prop), so re-measure
    // when the resolved direction flips — a direction change swaps which container
    // dimension is the size.
    watch(
      () => state.value.layout.direction,
      () => nextTick(() => measure()),
    );
    watch(
      () => props.breakpoints,
      () => nextTick(() => measure()),
      { deep: true },
    );
    watch(
      () => [props.grabCursor, props.cssMode],
      () => applyGrabCursor(false),
    );
    watch(
      () => props.breakpointsBase,
      () => {
        syncWindowResize();
        nextTick(() => measure());
      },
    );

    // Re-measure on any engine state change (covers slideTo / update / resize /
    // controller — frozen's four updateAutoHeight call sites) and on slide-element
    // changes. flush:'post' so the DOM is laid out before we read offsetHeight.
    watch(state, () => applyAutoHeight(), { flush: 'post' });
    watch(slideEls, () => applyAutoHeight(), { flush: 'post' });
    watch(
      () => props.autoHeight,
      () => applyAutoHeight(),
      { flush: 'post' },
    );
    watch(
      () => [props.height, props.width],
      () => {
        applyForcedSize();
        nextTick(() => measure());
      },
      { flush: 'post' },
    );

    onMounted(() => {
      // Guarantee slides are set before onReady. The first render already populated
      // harvested.value (the slot is invoked in render); push it now so the engine
      // has slides before onReady fires at the end of this hook.
      pushSlides();
      nextTick(() => measure());
      applyGrabCursor(false);
      applyForcedSize();
      applyAutoHeight();
      if (
        props.resizeObserver !== false &&
        typeof ResizeObserver !== 'undefined' &&
        containerEl.value
      ) {
        observer = new ResizeObserver(() => measureFromResize());
        observer.observe(containerEl.value);
      }
      syncWindowResize();
      boundDoc = containerEl.value?.ownerDocument;
      if (boundDoc) {
        boundDoc.addEventListener('pointermove', onPointerMove);
        boundDoc.addEventListener('pointerup', onPointerUp);
        boundDoc.addEventListener('pointercancel', onPointerUp);
      }
      if (typeof props.onReady === 'function') (props.onReady as (h: ModuleHost) => void)(host);
    });

    // After every re-render (incl. dynamic <Item v-for> list changes, which re-run
    // the render fn and refresh harvested.value), push the latest slide set to the
    // engine. Guarded by pushSlides so an unchanged set is a no-op (no loop).
    onUpdated(pushSlides);

    onBeforeUnmount(() => {
      const wEl = wrapperEl.value;
      if (wEl) wEl.style.height = '';
      if (windowResizeBound && typeof window !== 'undefined') {
        window.removeEventListener('resize', onWindowResize);
        windowResizeBound = false;
      }
      observer?.disconnect();
      offForwarders.forEach((off) => off());
      if (boundDoc) {
        boundDoc.removeEventListener('pointermove', onPointerMove);
        boundDoc.removeEventListener('pointerup', onPointerUp);
        boundDoc.removeEventListener('pointercancel', onPointerUp);
        boundDoc = undefined;
      }
      // If we built the host (no :host prop), dispose its module scope.
      if (!props.host) host.dispose();
    });

    return () => {
      const s = state.value;
      const vertical = s.layout.direction === 'vertical';
      const dir: Direction = vertical ? 'vertical' : 'horizontal';
      const { x: tx, y: ty } = renderTransform(s.translate, dir);

      const vw = engine.params.virtual ? s.virtual : null;
      const lo = vw ? Math.max(0, vw.from) : 0;
      const hi = vw ? Math.min(s.slides.length - 1, vw.to) : s.slides.length - 1;
      const rendered = vw ? s.slides.slice(lo, hi + 1) : s.slides;
      // Position the clamped (non-wrapping) window at its true grid coordinates: the rendered
      // subset starts at order-index `lo`, so it must shift right by the cumulative width of
      // the hidden-left slides (slidesGrid[lo]). This makes virtual rendering positionally
      // identical to non-virtual. Frozen's ported `vw.offset` assumes a wrapping render and
      // over-shifts under loop; for non-loop slidesGrid[lo] equals it (from >= 0, grid[0] = 0).
      const slideOffset = vw ? (s.slidesGrid[lo] ?? 0) : 0;

      // Allocate a fresh staging array each render cycle so ref callbacks can
      // write to it without reading slideEls.value (which would register slideEls
      // as a render dep and cause a reactive loop when the ref writes it back).
      // After all ref callbacks fire, the staging array is committed to slideEls
      // in one shot via queueMicrotask (outside the patch).
      // The commit is scheduled unconditionally so that when rendered.length === 0,
      // slideEls.value is reset to [] rather than retaining stale element refs.
      // Ref callbacks (below) only write into newEls — they never schedule their own
      // commit — so this single microtask is the only commit path. By microtask time
      // newEls is fully populated by all ref callbacks that fired during the patch.
      // SSR has no DOM: skip the per-slide ref staging entirely (the refs collect slide
      // elements for client-side measurement, which never runs on the server). This drops a
      // per-slide closure allocation + Vue's per-slide normalizeRef, plus the staging array
      // and the commit microtask, on every server render. Emitted HTML is identical (refs
      // never serialize), so hydration is unaffected.
      const ssr = typeof document === 'undefined';
      const newEls: (HTMLElement | null)[] = Array.from({ length: rendered.length }, () => null);
      if (!ssr) {
        queueMicrotask(() => {
          slideEls.value = newEls.slice(0, rendered.length);
        });
      }

      // Per-slide layout style. For slidesPerView:'auto' every slide's style is identical,
      // so build ONE shared object and reuse it across all slide vnodes (cuts per-slide
      // allocation → less GC). Vue only reads the style object, never mutates it.
      const dimKey = vertical ? 'height' : 'width';
      const sideKey = vertical ? 'top' : 'left';
      const offsetStyle =
        slideOffset !== 0 ? { position: 'relative' as const, [sideKey]: `${slideOffset}px` } : null;
      const autoStyle =
        props.slidesPerView === 'auto' ? { [dimKey]: 'auto', flexShrink: 0, ...offsetStyle } : null;

      // Invoke the slot HERE (inside render): Vue tracks the slot's reactive deps
      // and the vnodes are fresh (required — Vue forbids reusing vnode instances).
      // One harvest yields both the <Item> templates (stored in the plain holder for
      // onUpdated/onMounted to push to the engine) and the chrome (nav/pagination).
      const { items, chrome } = getItems(slots.default?.() ?? []);
      harvested.value = items;

      // Named positional slots (frozen parity): container-start / container-end (around the
      // wrapper, inside the container) + wrapper-start / wrapper-end (inside the wrapper,
      // around the slides). Invoked here in render so Vue tracks their reactive deps.
      const namedSlot = (name: string): VNode[] => {
        const fn = slots[name as keyof typeof slots];
        return fn ? (fn() as VNode[]) : [];
      };

      return h(
        props.tag,
        {
          ref: containerEl,
          dir: props.rtl ? 'rtl' : undefined,
          class: [...surferContainerClassNames(state.value), ...effectClasses.value],
          style: {
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: vertical ? 'pan-x' : 'pan-y',
          },
          onPointerdown: props.cssMode ? undefined : onPointerDown,
          onClick: props.cssMode ? undefined : onContainerClick,
        },
        [
          ...namedSlot('container-start'),
          h(
            props.wrapperTag,
            {
              ref: wrapperEl,
              class: 'v-surfer-wrapper',
              onTransitionend: props.cssMode ? undefined : onWrapperTransitionEnd,
              onScroll: props.cssMode ? onWrapperScroll : undefined,
              style: props.cssMode
                ? {
                    display: 'flex',
                    flexDirection: vertical ? 'column' : 'row',
                    [vertical ? 'rowGap' : 'columnGap']: `${props.spaceBetween ?? 0}px`,
                    [vertical ? 'overflowY' : 'overflowX']: 'scroll',
                    scrollSnapType: `${vertical ? 'y' : 'x'} mandatory`,
                    ...(s.cssModeCenteredOffset
                      ? {
                          '--v-surfer-centered-offset-before': `${s.cssModeCenteredOffset.before}px`,
                          '--v-surfer-centered-offset-after': `${s.cssModeCenteredOffset.after}px`,
                        }
                      : {}),
                  }
                : {
                    display: 'flex',
                    flexDirection: vertical ? 'column' : 'row',
                    [vertical ? 'rowGap' : 'columnGap']: `${props.spaceBetween ?? 0}px`,
                    ...(virtualTranslate.value
                      ? {}
                      : {
                          transform: `translate3d(${tx}px, ${ty}px, 0px)`,
                          transitionDuration: `${s.transitionDuration}ms`,
                        }),
                  },
            },
            [
              ...namedSlot('wrapper-start'),
              ...rendered.map((cs, pos) => {
                const item = harvested.value[cs.realIndex];
                // Shared per-slide attrs — identical whether the slide has content or not.
                const slideClass = slideClassNames(cs);
                // Loop mode: tag each slide with its real (original) index so consumers
                // (navigation, a11y, external code) can identify slides by real position.
                // Mirrors frozen's data-v-surfer-slide-index set in loopCreate (src/core/loop/loopCreate.ts:22)
                // and the Vue v-surfer-slide component (src/vue/v-surfer-slide.ts:112).
                // Note: virtual-mode slide indexing is not yet handled (known gap — frozen also sets
                // this attribute for virtual slides; the kit will when virtual-mode modules are exposed).
                const slideDataIndex = s.layout.loop ? cs.realIndex : undefined;
                // No ref on the server (no DOM to collect); on the client the callback writes
                // into the per-render staging array (no reactive read → slideEls not tracked
                // as a render dep), committed once via the microtask above.
                const slideRef = ssr
                  ? undefined
                  : (el: unknown) => {
                      newEls[pos] = (el as HTMLElement) ?? null;
                    };
                const slideStyle =
                  autoStyle ??
                  ({
                    [dimKey]: s.slidesSizesGrid[cs.index]
                      ? `${s.slidesSizesGrid[cs.index]}px`
                      : undefined,
                    flexShrink: 0,
                    ...offsetStyle,
                  } as Record<string, string | number | undefined>);

                // A slide with no <Item> render fn has no descendants to resolve a slide,
                // so it stays a plain div — no ItemFlags allocation, no SlideRoot instance.
                if (!item?.render) {
                  return h('div', {
                    key: cs.realIndex,
                    class: slideClass,
                    'data-v-surfer-slide-index': slideDataIndex,
                    ref: slideRef,
                    style: slideStyle,
                  });
                }
                // Content slides render through SlideRoot, whose single root div both
                // carries these (fall-through) attrs AND provides the slide's flags for
                // useSurferSlide(). The <Item> slot still receives `flags` positionally,
                // so <Item v-slot> access is unchanged. Single root → no SSR fragment anchors.
                const flags: ItemFlags = {
                  index: cs.index,
                  realIndex: cs.realIndex,
                  isActive: cs.isActive,
                  isPrev: cs.isPrev,
                  isNext: cs.isNext,
                  isVisible: cs.isVisible,
                  isFullyVisible: cs.isFullyVisible,
                  data: item.data,
                };
                return h(
                  SlideRoot,
                  {
                    key: cs.realIndex,
                    flags,
                    slideRef,
                    class: slideClass,
                    'data-v-surfer-slide-index': slideDataIndex,
                    style: slideStyle,
                  },
                  { default: () => item.render!(flags) },
                );
              }),
              ...namedSlot('wrapper-end'),
            ],
          ),
          ...chrome,
          ...namedSlot('container-end'),
        ],
      );
    };
  },
});

export default Surfer;
