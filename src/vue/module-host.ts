import {
  shallowRef,
  reactive,
  computed,
  inject,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  watch,
  toValue,
  type ShallowRef,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';
import { createEngine } from '../headless/engine';
import type {
  Engine,
  EngineState,
  EngineParamsInput,
  EngineParams,
  GroupedParamsInput,
} from '../headless/types';
import {
  minTranslate as minTranslateFn,
  maxTranslate as maxTranslateFn,
} from '../headless/translate';
import { slidesPerViewDynamic as slidesPerViewDynamicFn } from '../headless/slides-per-view-dynamic';
import type { CoreEvents } from './core-events';
import { useEngine } from './use-engine';

/**
 * A type-scoped emitter: callable only with the event names of `E`, each with its declared
 * payload (no payload when the payload type is `void`). At runtime all scoped emitters call
 * the same private `busEmit`; the scoping is purely a compile-time guard.
 */
export type ScopedEmit<E extends object> = <K extends keyof E>(
  name: K,
  ...payload: E[K] extends void ? [] : [E[K]]
) => void;

/**
 * Engine params accepted by `useSurferHost`, each as a raw value, a ref, or a
 * getter (`MaybeRefOrGetter`). Reactive entries are resolved with `toValue` and
 * re-applied to the engine via `setParams` whenever they change, so a consumer
 * can hand the host live refs instead of wiring `engine.setParams` themselves.
 */
export type ReactiveEngineParams = {
  [K in keyof GroupedParamsInput]?: MaybeRefOrGetter<GroupedParamsInput[K]>;
};

/** The engine-backed core — what a module's `setup` receives as `host`. */
export interface CoreHost {
  engine: Engine<unknown>;
  state: ShallowRef<EngineState<unknown>>;
  activeIndex: ComputedRef<number>;
  realIndex: ComputedRef<number>;
  count: ComputedRef<number>;
  previousIndex: ComputedRef<number>;
  snapIndex: ComputedRef<number>;
  progress: ComputedRef<number>;
  isBeginning: ComputedRef<boolean>;
  isEnd: ComputedRef<boolean>;
  isLocked: ComputedRef<boolean>;
  translate: ComputedRef<number>;
  animating: ComputedRef<boolean>;
  swipeDirection: ComputedRef<'prev' | 'next' | undefined>;
  touches: ComputedRef<EngineState<unknown>['touches']>;
  slides: ComputedRef<EngineState<unknown>['slides']>;
  slidesGrid: ComputedRef<number[]>;
  snapGrid: ComputedRef<number[]>;
  slidesSizesGrid: ComputedRef<number[]>;
  /** The fully-resolved params (= frozen surfer.params). */
  params: EngineParams;
  /** Container width in px (= frozen surfer.width). 0 before mount. */
  width: number;
  /** Container height in px (= frozen surfer.height). 0 before mount. */
  height: number;
  goTo(index: number, opts?: { speed?: number }): void;
  next(opts?: { speed?: number }): void;
  prev(opts?: { speed?: number }): void;
  // --- Navigation methods (Spec 1) ---
  slideToLoop(realIndex: number, opts?: { speed?: number }): void;
  slideToClosest(opts?: { speed?: number }): void;
  slideReset(opts?: { speed?: number }): void;
  // --- Translate methods (Spec 1) ---
  getTranslate(): number;
  setTranslate(translate: number): void;
  translateTo(translate: number, speed?: number): void;
  minTranslate(): number;
  maxTranslate(): number;
  /** `speed` is accepted for frozen signature parity but ignored (free-scrub has no transition). */
  setProgress(progress: number, speed?: number): void;
  // --- Control methods (Spec 1) ---
  update(): void;
  updateSize(): void;
  updateSlides(): void;
  updateProgress(): void;
  updateSlidesClasses(): void;
  updateAutoHeight(): void;
  slidesPerViewDynamic(view?: 'current' | 'previous', exact?: boolean): number;
  setGrabCursor(): void;
  unsetGrabCursor(): void;
  /** Flip the layout direction via a param override; no arg toggles the current resolved direction. */
  changeDirection(direction?: 'horizontal' | 'vertical'): void;
  /** Interaction gate (frozen `surfer.enabled`). While false, drags do not start. */
  enabled: ShallowRef<boolean>;
  enable(): void;
  disable(): void;
  containerEl: ShallowRef<HTMLElement | null>;
  wrapperEl: ShallowRef<HTMLElement | null>;
  slideEls: ShallowRef<(HTMLElement | null)[]>;
  /** Logical index of the last tapped slide; -1 when none (= frozen surfer.clickedIndex). */
  clickedIndex: ShallowRef<number>;
  /** The last tapped slide element; null when none (= frozen surfer.clickedSlide). */
  clickedSlide: ShallowRef<HTMLElement | null>;
  virtualTranslate: ShallowRef<boolean>;
  effectClasses: ShallowRef<string[]>;
  paramOverrides: ShallowRef<Partial<EngineParamsInput>>;
  /** Subscribe to a bus event by name. Returns an unsubscribe fn. Typed fully on TypedModuleHost. */
  on(name: string, handler: (payload?: unknown) => void): () => void;
  /** The core layer's scoped emitter (used by Surfer to push DOM touch/resize events). */
  coreEmit: ScopedEmit<CoreEvents>;
}

export interface ModuleDef<
  K extends string = string,
  Config extends object = object,
  Api = void,
  Events extends object = Record<never, never>,
> {
  key: K;
  setup?: (ctx: { host: CoreHost; config: Config; emit: ScopedEmit<Events> }) => Api;
}

/** Define a typed module. Config + Events explicit; key + api inferred. */
export function defineSurferModule<
  Config extends object,
  Events extends object = Record<never, never>,
>() {
  return <K extends string, Api = void>(
    key: K,
    setup?: (ctx: { host: CoreHost; config: Config; emit: ScopedEmit<Events> }) => Api,
  ): ModuleDef<K, Config, Api, Events> => ({ key, setup });
}

// oxlint-disable-next-line typescript/no-explicit-any -- module-list element types are heterogeneous; the public API re-narrows via the mapped types below.
type ModuleList = readonly ModuleDef<string, any, any, any>[];
type ConfigOf<D> = D extends ModuleDef<string, infer C, unknown, object> ? C : never;
type ApiOf<D> = D extends ModuleDef<string, object, infer A, object> ? A : never;
type EventsOf<D> = D extends ModuleDef<string, object, unknown, infer E> ? E : never;

// Merge every module's Events map (by event name) into one object type.
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
type MergedModuleEvents<M extends ModuleList> = UnionToIntersection<EventsOf<M[number]>>;

/** Every event a host of module-list M can emit: core events + all modules' declared events. */
export type HostEvents<M extends ModuleList> = CoreEvents & MergedModuleEvents<M>;

type ConfigInput<M extends ModuleList> = { [D in M[number] as D['key']]?: Partial<ConfigOf<D>> };
type ConfigState<M extends ModuleList> = { [D in M[number] as D['key']]: ConfigOf<D> };
type ModuleApiMap<M extends ModuleList> = {
  [D in M[number] as [ApiOf<D>] extends [void] ? never : D['key']]: ApiOf<D>;
};

export interface ModuleHost extends CoreHost {
  // `object` (not Record<string, unknown>) so a TypedModuleHost<M> — whose
  // ConfigState values are specific config interfaces (which lack an index
  // signature and so are NOT assignable to Record<string, unknown>) — is a
  // proper subtype of ModuleHost and can be passed to <Surfer :host>.
  config: Record<string, object>;
  modules: Record<string, unknown>;
  dispose(): void;
}

export type TypedModuleHost<M extends ModuleList> = Omit<CoreHost, 'on'> & {
  config: ConfigState<M>;
  modules: ModuleApiMap<M>;
  dispose(): void;
  on<E extends keyof HostEvents<M>>(
    name: E,
    handler: (payload: HostEvents<M>[E]) => void,
  ): () => void;
};

export const HOST_KEY: InjectionKey<ModuleHost> = Symbol('surferHost');

export function useSurferHost<const M extends ModuleList = []>(
  opts: ReactiveEngineParams & { modules?: M; config?: ConfigInput<M> } = {},
): TypedModuleHost<M> {
  const { modules: moduleList, config: configInput, ...engineParams } = opts;

  const virtualTranslate = shallowRef(false);
  const effectClasses = shallowRef<string[]>([]);
  const paramOverrides = shallowRef<Partial<EngineParamsInput>>({});
  const enabled = shallowRef(true);

  // Resolve the (possibly reactive) param entries to plain values. Keys whose
  // resolved value is undefined are omitted so engine defaults apply.
  // paramOverrides are merged LAST so they take precedence over base params.
  const resolveParams = (): GroupedParamsInput => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(engineParams)) {
      const v = toValue((engineParams as Record<string, MaybeRefOrGetter<unknown>>)[key]);
      if (v !== undefined) out[key] = v;
    }
    return { ...out, ...paramOverrides.value } as GroupedParamsInput;
  };

  // The host event bus: one synchronous string-keyed channel. Every emitter (engine bridge,
  // coreEmit, each module's ScopedEmit) calls busEmit; on() subscribers filter by name.
  const listeners = new Set<(name: string, payload?: unknown) => void>();
  const busEmit = (name: string, payload?: unknown): void => {
    // oxlint-disable-next-line unicorn/no-useless-spread -- spread needed to prevent mutation-during-iteration when handlers unsubscribe
    for (const l of [...listeners]) l(name, payload);
  };
  const on = (name: string, handler: (payload?: unknown) => void): (() => void) => {
    const wrapped = (n: string, p?: unknown): void => {
      if (n === name) handler(p);
    };
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  };
  const coreEmit = ((name: string, payload?: unknown) =>
    busEmit(name, payload)) as ScopedEmit<CoreEvents>;

  const engine = createEngine<unknown>(resolveParams());
  const containerEl = shallowRef<HTMLElement | null>(null);
  const wrapperEl = shallowRef<HTMLElement | null>(null);
  const slideEls = shallowRef<(HTMLElement | null)[]>([]);
  const clickedIndex = shallowRef(-1);
  const clickedSlide = shallowRef<HTMLElement | null>(null);
  const config = reactive<Record<string, Record<string, unknown>>>({});
  const modules: Record<string, unknown> = {};
  const scope = effectScope();

  const core = scope.run(() => {
    const state = useEngine(engine);
    // Bridge the engine's named-event channel into the host bus (one-directional). The engine
    // stays DOM-free; the host owns the unified surface. Torn down with the scope.
    const offEngineBridge = engine.onEvent((name, arg) => busEmit(name, arg));
    onScopeDispose(() => {
      offEngineBridge();
      listeners.clear();
    });
    // Re-apply params to the engine when any reactive entry changes. Not immediate:
    // createEngine already consumed the initial values above. Owned by this scope,
    // so dispose()/scope.stop() tears it down.
    watch(resolveParams, (next) => engine.setParams(next));
    const activeIndex = computed(() => state.value.activeIndex);
    const realIndex = computed(() => state.value.realIndex);
    const count = computed(() => state.value.slides.length);
    const previousIndex = computed(() => state.value.previousIndex);
    const snapIndex = computed(() => state.value.snapIndex);
    const progress = computed(() => state.value.progress);
    const isBeginning = computed(() => state.value.isBeginning);
    const isEnd = computed(() => state.value.isEnd);
    const isLocked = computed(() => state.value.isLocked);
    const translate = computed(() => state.value.translate);
    const animating = computed(() => state.value.animating);
    const swipeDirection = computed(() => state.value.swipeDirection);
    const touches = computed(() => state.value.touches);
    const slides = computed(() => state.value.slides);
    const slidesGrid = computed(() => state.value.slidesGrid);
    const snapGrid = computed(() => state.value.snapGrid);
    const slidesSizesGrid = computed(() => state.value.slidesSizesGrid);
    const c: CoreHost = {
      engine,
      state,
      activeIndex,
      realIndex,
      count,
      previousIndex,
      snapIndex,
      progress,
      isBeginning,
      isEnd,
      isLocked,
      translate,
      animating,
      swipeDirection,
      touches,
      slides,
      slidesGrid,
      snapGrid,
      slidesSizesGrid,
      get params() {
        return engine.params;
      },
      get width() {
        return containerEl.value?.clientWidth ?? 0;
      },
      get height() {
        return containerEl.value?.clientHeight ?? 0;
      },
      goTo: (index, o) => engine.slideTo(index, o),
      next: (o) => engine.slideNext(o),
      prev: (o) => engine.slidePrev(o),
      slideToLoop: (realIndex, o) => engine.slideToLoop(realIndex, o),
      slideToClosest: (o) => engine.slideToClosest(o),
      slideReset: (o) => engine.slideTo(state.value.activeIndex, o),
      getTranslate: () => state.value.translate,
      setTranslate: (t) => engine.setTranslate(t),
      translateTo: (t, speed) => engine.setTranslate(t, { speed }),
      minTranslate: () => minTranslateFn(state.value.snapGrid),
      maxTranslate: () => maxTranslateFn(state.value.snapGrid),
      // engine.setProgress has no speed arg (free-scrub is instant); `speed` ignored.
      setProgress: (progress) => engine.setProgress(progress),
      update: () => engine.recompute(),
      // The kit derives progress / classes / auto-height reactively from the snapshot,
      // so one recompute covers all five frozen update* entry points.
      updateSize: () => engine.recompute(),
      updateSlides: () => engine.recompute(),
      updateProgress: () => engine.recompute(),
      updateSlidesClasses: () => engine.recompute(),
      updateAutoHeight: () => engine.recompute(),
      slidesPerViewDynamic: (view = 'current', exact = false) => {
        const s = state.value;
        return slidesPerViewDynamicFn(view, exact, {
          slidesPerView: s.layout.slidesPerView,
          centeredSlides: s.layout.centeredSlides,
          slidesGrid: s.slidesGrid,
          slidesSizesGrid: s.slidesSizesGrid,
          containerSize: s.size,
          activeIndex: s.activeIndex,
        });
      },
      setGrabCursor: () => {
        if (wrapperEl.value) wrapperEl.value.style.cursor = 'grab';
      },
      unsetGrabCursor: () => {
        if (wrapperEl.value) wrapperEl.value.style.cursor = '';
      },
      changeDirection: (direction) => {
        const next =
          direction ?? (state.value.layout.direction === 'horizontal' ? 'vertical' : 'horizontal');
        paramOverrides.value = { ...paramOverrides.value, direction: next };
      },
      enabled,
      enable: () => {
        enabled.value = true;
      },
      disable: () => {
        enabled.value = false;
      },
      containerEl,
      wrapperEl,
      slideEls,
      clickedIndex,
      clickedSlide,
      virtualTranslate,
      effectClasses,
      paramOverrides,
      on,
      coreEmit,
    };
    for (const m of moduleList ?? []) {
      config[m.key] = { ...(configInput as Record<string, object> | undefined)?.[m.key] };
      if (m.setup) {
        modules[m.key] = m.setup({
          host: c,
          // oxlint-disable-next-line typescript/no-explicit-any -- reactive child proxy typed via ConfigState at the public boundary.
          config: config[m.key] as any,
          // Each module's emitter is name/payload-scoped to its own Events at the type level;
          // at runtime every scoped emitter funnels into the same busEmit.
          emit: coreEmit as unknown as ScopedEmit<object>,
        });
      }
    }
    return c;
  })!;

  if (getCurrentScope()) onScopeDispose(() => scope.stop());

  return {
    ...core,
    get params() {
      return core.params;
    },
    get width() {
      return core.width;
    },
    get height() {
      return core.height;
    },
    config,
    modules,
    dispose: () => scope.stop(),
    virtualTranslate,
    effectClasses,
    paramOverrides,
  } as unknown as TypedModuleHost<M>;
}

/** Inject the provided host. For <Item> and module components. */
export function injectHost(): ModuleHost {
  const host = inject(HOST_KEY);
  if (!host) throw new Error('Must be used inside a <Surfer>');
  return host;
}

/** Ergonomic public alias for injectHost(): grab the live host (state, methods, events)
 * from anywhere inside a <Surfer> subtree. The Vue-native analog of Surfer's useSurfer(). */
export const useSurfer = injectHost;
