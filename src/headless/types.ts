import type { VirtualWindow } from './virtual';

/** Raw consumer-supplied params (all optional); normalized by `normalizeParams`. */
export interface EngineParamsInput {
  slidesPerView?: number | 'auto';
  direction?: 'horizontal' | 'vertical';
  rtl?: boolean;
  loop?: boolean;
  rewind?: boolean;
  loopAdditionalSlides?: number;
  virtual?: boolean;
  addSlidesBefore?: number;
  addSlidesAfter?: number;
  /**
   * For `slidesPerView: 'auto'` + `virtual` only: the estimated number of slides the
   * consumer expects to be visible, used as the virtual window's slidesPerView (since
   * 'auto' has no numeric value and the server has no measurement). 0 = fall back to 1.
   */
  virtualAutoSlidesPerView?: number;
  spaceBetween?: number;
  speed?: number;
  initialSlide?: number;
  slidesPerGroup?: number;
  slidesPerGroupSkip?: number;
  slidesPerGroupAuto?: boolean;
  centeredSlides?: boolean;
  centerInsufficientSlides?: boolean;
  centeredSlidesBounds?: boolean;
  loopPreventsSliding?: boolean;
  roundLengths?: boolean;
  autoHeight?: boolean;
  freeMode?: boolean;
  freeModeMomentum?: boolean;
  freeModeMomentumRatio?: number;
  freeModeMomentumVelocityRatio?: number;
  freeModeMomentumBounce?: boolean;
  freeModeMomentumBounceRatio?: number;
  freeModeSticky?: boolean;
  freeModeMinimumVelocity?: number;
  normalizeSlideIndex?: boolean;
  allowTouchMove?: boolean;
  allowSlideNext?: boolean;
  allowSlidePrev?: boolean;
  simulateTouch?: boolean;
  touchRatio?: number;
  touchAngle?: number;
  touchReleaseOnEdges?: boolean;
  threshold?: number;
  resistance?: boolean;
  resistanceRatio?: number;
  followFinger?: boolean;
  shortSwipes?: boolean;
  longSwipes?: boolean;
  longSwipesMs?: number;
  longSwipesRatio?: number;
  oneWayMovement?: boolean;
  cssMode?: boolean;
  /** Responsive overrides keyed by min-width px ("640") or height-ratio ("@0.75"). */
  breakpoints?: { [key: string]: BreakpointParams };
}

/** One-level-nested group inputs — collapsed to the flat fields by `flattenGroups`. */
export interface LoopInput {
  enabled?: boolean;
  additionalSlides?: number;
  preventsSliding?: boolean;
}
export interface FreeModeInput {
  enabled?: boolean;
  momentum?: boolean;
  momentumRatio?: number;
  momentumVelocityRatio?: number;
  momentumBounce?: boolean;
  momentumBounceRatio?: number;
  sticky?: boolean;
  minimumVelocity?: number;
}
export interface VirtualInput {
  enabled?: boolean;
  addSlidesBefore?: number;
  addSlidesAfter?: number;
  autoSlidesPerView?: number;
}
export interface CenteredInput {
  enabled?: boolean;
  insufficientSlides?: boolean;
  bounds?: boolean;
}
export interface GroupInput {
  perGroup?: number;
  skip?: number;
  auto?: boolean;
}
export interface TouchInput {
  allow?: boolean;
  simulate?: boolean;
  ratio?: number;
  angle?: number;
  releaseOnEdges?: boolean;
  threshold?: number;
  followFinger?: boolean;
}

/**
 * The public param input: the flat `EngineParamsInput` plus one-level-nested group
 * sugar (loop/freeMode/virtual/centered/group/touch). `flattenGroups` collapses the
 * nested groups to the flat fields before normalization, so the engine's hot path only
 * ever reads the flat, fully-resolved `EngineParams`. Flat fields and nested groups can
 * be mixed; an explicit flat field wins over a nested-derived one. A group given as a
 * bare `boolean` (or `{}`) is the `enabled` shorthand.
 */
export type GroupedParamsInput = Omit<EngineParamsInput, 'loop' | 'freeMode' | 'virtual'> & {
  loop?: boolean | LoopInput;
  freeMode?: boolean | FreeModeInput;
  virtual?: boolean | VirtualInput;
  centered?: boolean | CenteredInput;
  group?: GroupInput;
  touch?: TouchInput;
};

/** A breakpoint's overrides — flat layout params only; loop/direction/breakpoints excluded. */
export type BreakpointParams = Omit<
  Partial<EngineParamsInput>,
  'loop' | 'direction' | 'breakpoints'
>;

/** Fully-resolved params (every field present). `breakpoints` is layered separately, not a resolved field. */
export type EngineParams = Required<Omit<EngineParamsInput, 'breakpoints'>>;

/** A consumer slide: arbitrary data plus an optional stable id. */
export interface SlideInput<T> {
  id?: string;
  data: T;
}

/** A slide handed back to the consumer, annotated with computed state. */
export interface ComputedSlide<T> {
  data: T;
  index: number;
  realIndex: number;
  size: number;
  offset: number;
  progress: number;
  isActive: boolean;
  isPrev: boolean;
  isNext: boolean;
  isVisible: boolean;
  isFullyVisible: boolean;
}

/** The immutable snapshot consumers read. */
export interface EngineState<T> {
  translate: number;
  transitionDuration: number;
  activeIndex: number;
  realIndex: number;
  /** The activeIndex value from before the most recent change (= frozen surfer.previousIndex). */
  previousIndex: number;
  progress: number;
  /**
   * Continuous loop progress (= frozen `surfer.progressLoop`). Unlike `progress`,
   * it does not reset when a loop wrap repositions the translate. Equals `progress`
   * when `loop` is off.
   */
  progressLoop: number;
  /** Render window when `virtual` is enabled (frozen `surfer.virtual`); null otherwise. */
  virtual: VirtualWindow | null;
  /**
   * cssMode only: the absolute target translate a programmatic move wants the
   * adapter to scroll to (speed 0 = jump, >0 = smooth). Non-null ONLY on the
   * snapshot emitted by that move; null on every other snapshot (incl. scroll
   * feedback) so the adapter scrolls once per move and a scroll echo never re-fires.
   */
  scrollSnapTarget: { translate: number; speed: number } | null;
  /**
   * cssMode + centeredSlides only: the centered scroll offsets (frozen
   * --v-surfer-centered-offset-before/after) for the adapter's CSS vars. Null otherwise.
   */
  cssModeCenteredOffset: { before: number; after: number } | null;
  /**
   * Resolved param flags consumers derive UI from (container classes via addClasses,
   * plus navigation enable/disable). Carries no measurement, so it is correct before
   * geometry (SSR-safe). `loop`/`rewind` let nav modules stay enabled under loop even
   * when isBeginning/isEnd are true (frozen navigation returns early under loop).
   */
  layout: {
    direction: 'horizontal' | 'vertical';
    rtl: boolean;
    cssMode: boolean;
    centeredSlides: boolean;
    freeMode: boolean;
    virtual: boolean;
    loop: boolean;
    rewind: boolean;
    autoHeight: boolean;
    slidesPerView: number | 'auto';
  };
  /** Container size along the active axis (= frozen `surfer.size`). 0 before measurement. */
  size: number;
  /** Total content size along the active axis (= frozen `surfer.virtualSize`). 0 before measurement. */
  virtualSize: number;
  isBeginning: boolean;
  isEnd: boolean;
  touching: boolean;
  /** True while a `speed > 0` slide transition is in flight (= frozen `surfer.animating`). */
  animating: boolean;
  /** False after a drag that actually translated, until the next pointerStart (= frozen `surfer.allowClick`). Consumed by preventClicks. */
  allowClick: boolean;
  /** The engine `translate` captured at the most recent pointerStart (0 before any drag). Used by the cards effect. */
  startTranslate: number;
  /** snapGrid index nearest the current translate (= frozen surfer.snapIndex). */
  snapIndex: number;
  /** Direction of the last drag; persists until the next pointerStart (= frozen surfer.swipeDirection). */
  swipeDirection: 'prev' | 'next' | undefined;
  /** Live pointer coordinates of the current/last gesture (= frozen surfer.touches subset). */
  touches: { startX: number; startY: number; currentX: number; currentY: number; diff: number };
  /** Content fits — snapGrid has <=1 stop (kit lock proxy; = frozen surfer.isLocked). */
  isLocked: boolean;
  /** Active breakpoint key (= frozen surfer.currentBreakpoint); undefined when none applies. */
  breakpoint: string | undefined;
  slidesSizesGrid: number[];
  slidesGrid: number[];
  snapGrid: number[];
  slides: ComputedSlide<T>[];
}

/** A single pointer sample forwarded by the consumer. */
export interface PointerSample {
  x: number;
  y: number;
  time: number;
}

export interface EngineDeps {
  /**
   * Defer a loop wrap's *final* commit so the reposition baseline paints first.
   * Production default is a double `requestAnimationFrame`; tests inject a
   * synchronous flush (`fn => fn()`) to keep assertions deterministic.
   */
  scheduler?: (fn: () => void) => void;
}

/** The headless engine: pushed-in commands/measurements, snapshot + subscribe out. */
export interface Engine<T> {
  setSlides(slides: SlideInput<T>[]): void;
  /**
   * Push container size and (for slidesPerView:'auto') per-slide sizes. `sizes` is
   * keyed by REAL slide index (sizes[realIndex] = size), NOT layout position — the
   * engine reorders it through the current loop order internally.
   */
  setGeometry(geometry: { containerSize: number; sizes?: number[] }): void;
  setParams(params: GroupedParamsInput): void;
  setBreakpointDimensions(dims: { width: number; height?: number }): void;
  insertSlides(at: number, slides: SlideInput<T> | SlideInput<T>[]): void;
  removeSlides(indexes: number | number[]): void;
  clearSlides(): void;
  appendSlide(slides: SlideInput<T> | SlideInput<T>[]): void;
  prependSlide(slides: SlideInput<T> | SlideInput<T>[]): void;
  addSlide(index: number, slides: SlideInput<T> | SlideInput<T>[]): void;
  removeSlide(indexes: number | number[]): void;
  removeAllSlides(): void;
  slideTo(index: number, opts?: { speed?: number; runCallbacks?: boolean }): void;
  slideNext(opts?: { speed?: number }): void;
  slidePrev(opts?: { speed?: number }): void;
  slideToLoop(realIndex: number, opts?: { speed?: number }): void;
  /** Free-scrub to a logical progress fraction (0 = beginning, 1 = end); no snap, no transition. */
  setProgress(progress: number): void;
  /**
   * Re-run geometry from the engine's cached container size / slide sizes / params and
   * commit a fresh snapshot — the DOM-free analog of frozen `surfer.update()` /
   * `updateSlides()` / `updateSize()`. No DOM measurement happens here; the kit's
   * ResizeObserver feeds real size changes via setGeometry.
   */
  recompute(): void;
  /**
   * Set an absolute translate (verbatim, NOT clamped — matching frozen's slave
   * setTranslate, which the controller calls without clamping so the slave can
   * follow a master into drag-overshoot) with an optional transition duration,
   * recompute activeIndex, and commit/emit. Used by the controller link.
   */
  setTranslate(translate: number, opts?: { speed?: number }): void;
  /** Snap the current (possibly free) position to the closest slide. `threshold` overrides the frozen 0.5 rule. */
  slideToClosest(opts?: { speed?: number; runCallbacks?: boolean; threshold?: number }): void;
  pointerStart(sample: PointerSample): void;
  pointerMove(sample: PointerSample): { moved: boolean; scrolling: boolean };
  pointerEnd(sample: PointerSample): void;
  onTransitionEnd(): void;
  readonly state: EngineState<T>;
  /** The fully-resolved params currently in effect (= frozen surfer.params). */
  readonly params: EngineParams;
  subscribe(listener: (state: EngineState<T>) => void): () => void;
  /** Named-event channel (frozen-ported events). Returns an unsubscribe fn. */
  onEvent(listener: (name: string, arg?: number) => void): () => void;
  destroy(): void;
}
