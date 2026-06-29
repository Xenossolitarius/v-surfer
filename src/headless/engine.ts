import type {
  Engine,
  EngineDeps,
  EngineParams,
  EngineState,
  GroupedParamsInput,
  PointerSample,
  SlideInput,
} from './types';
import { normalizeParams } from './params';
import { computeGeometry } from './slides-geometry';
import { minTranslate, maxTranslate } from './translate';
import { computeProgress, computeLoopProgress, activeIndexByTranslate } from './active-index';
import { freeModeRelease, type FreeModeInput } from './free-mode';
import { computeSlideFlags } from './slide-state';
import { slidesPerViewDynamic } from './slides-per-view-dynamic';
import { resolveSlideTo, resolveSlidePrev } from './slide-to';
import {
  createGestureState,
  gestureStart,
  gestureMove,
  gestureEnd,
  type GestureEnv,
} from './gestures';
import { createStore } from './state';
import { rtlTranslate } from './direction';
import { computeLoopFix, slideToLoopTarget } from './loop';
import { resolveBreakpoint, mergeBreakpointParams } from './breakpoints';
import type { BreakpointParams } from './types';
import { closestSlideIndex } from './slide-to-closest';
import { virtualWindow } from './virtual';
import { diffEvents, snapIndexOf } from './events';

export function createEngine<T>(
  paramsInput: GroupedParamsInput = {},
  deps: EngineDeps = {},
): Engine<T> {
  const { breakpoints: bpInit, ...baseInit } = paramsInput;
  let baseParams: GroupedParamsInput = baseInit;
  let breakpoints: Record<string, BreakpointParams> | undefined = bpInit;
  let currentBreakpoint: string | undefined = undefined;
  let currentDims: { width: number; height?: number } | null = null;
  let params: EngineParams = normalizeParams(baseParams);
  let containerSize = 0;
  let slides: SlideInput<T>[] = [];
  let loopOrder: number[] = [];

  let translate = 0;
  let transitionDuration = 0;
  let activeIndex = params.initialSlide;
  let previousIndex = 0;
  let touching = false;
  let animating = false;
  let allowClick = true;
  let startTranslate = 0;
  let lastTransitionDir: 'next' | 'prev' | 'reset' | null = null;

  // Per-slide measured sizes for slidesPerView:'auto', keyed by REAL slide index
  // (measuredSizes[realIndex] = that slide's size). rebuildGrid() maps it through
  // loopOrder so loop rotation never mis-aligns sizes. Numeric slidesPerView ignores it.
  let measuredSizes: number[] = [];
  let slidesSizesGrid: number[] = [];
  let slidesGrid: number[] = [0];
  let snapGrid: number[] = [0];
  let offsetsGrid: number[] = [0];
  let virtualSize = 0;

  let pendingBounce: { afterBouncePosition: number; settleSpeed: number } | null = null;
  let scrollSnapTargetPending: { translate: number; speed: number } | null = null;
  let cssModeCenteredOffset: { before: number; after: number } | null = null;

  const gesture = createGestureState();

  const defaultScheduler = (fn: () => void): void => {
    if (typeof requestAnimationFrame === 'function') {
      // Two frames: the reposition paints on the first, the final transitions on the next.
      requestAnimationFrame(() => requestAnimationFrame(fn));
    } else {
      fn();
    }
  };
  const scheduler = deps.scheduler ?? defaultScheduler;

  // A loop wrap commits the reposition inline, then defers the final commit so the
  // baseline paints first. `wrapGen` invalidates a scheduled final if a newer nav
  // (or a flush) supersedes it; `flushPending` settles an in-flight wrap synchronously
  // before any new nav so rapid clicks can't strand it.
  let pendingFinal: (() => void) | null = null;
  let wrapGen = 0;
  function scheduleFinal(fn: () => void): void {
    const gen = ++wrapGen;
    pendingFinal = fn;
    scheduler(() => {
      if (gen === wrapGen) {
        pendingFinal = null;
        fn();
      }
    });
  }
  function flushPending(): void {
    if (pendingFinal) {
      wrapGen += 1; // invalidate the already-scheduled callback
      const fn = pendingFinal;
      pendingFinal = null;
      fn();
    }
  }

  function buildSnapshot(): EngineState<T> {
    const { progress, isBeginning, isEnd } = computeProgress(translate, snapGrid);
    const progressLoop = params.loop
      ? computeLoopProgress(translate, slidesGrid, loopOrder, slides.length)
      : progress;
    // In centered mode the wrapper starts pushed right so slide 0 centers; that
    // origin (minTranslate) shifts every slide's progress. Zero when not centered.
    const centeredOrigin = params.centeredSlides ? minTranslate(snapGrid) : 0;
    const computedSlides = loopOrder.map((realIdx, pos) => {
      const offset = offsetsGrid[pos] ?? 0;
      const size = slidesSizesGrid[pos] ?? 0;
      const denom = size + params.spaceBetween;
      const flags = computeSlideFlags({
        index: pos,
        offset,
        size,
        translate,
        containerSize,
        activeIndex,
      });
      return {
        data: slides[realIdx]!.data,
        index: pos,
        realIndex: realIdx,
        ...flags,
        size,
        offset,
        progress: denom === 0 ? 0 : (-translate + centeredOrigin - offset) / denom,
      };
    });
    // During a drag the stored activeIndex is frozen (it only advances on release), but the
    // virtual window must follow the live translate or the rendered slides scroll off-screen
    // and the viewport goes blank. Mirror frozen's virtual.update(), which calls
    // updateActiveIndex() on every setTranslate. In settled states translate is snapped to
    // -slidesGrid[activeIndex], so this equals activeIndex (no non-drag divergence).
    const windowActiveIndex =
      params.virtual && touching && slidesGrid.length > 0
        ? activeIndexByTranslate(translate, slidesGrid, params)
        : activeIndex;
    const virtual = params.virtual
      ? virtualWindow({
          activeIndex: windowActiveIndex,
          slidesGrid,
          slidesLength: loopOrder.length,
          // 'auto' has no numeric slidesPerView for the window math. Frozen's virtual
          // module derives one from the measured container size (slidesPerViewAutoSlideSize);
          // here a consumer-supplied estimate (virtualAutoSlidesPerView) is used instead, so
          // the window has a useful size even before/without measurement (incl. SSR). Falls
          // back to 1 (frozen's no-estimate default) when unset.
          slidesPerView:
            typeof params.slidesPerView === 'number'
              ? params.slidesPerView
              : params.virtualAutoSlidesPerView || 1,
          slidesPerGroup: params.slidesPerGroup,
          centeredSlides: params.centeredSlides,
          loop: params.loop,
          addSlidesBefore: params.addSlidesBefore,
          addSlidesAfter: params.addSlidesAfter,
        })
      : null;
    const snapshotTranslate = rtlTranslate(params.rtl, params.direction)
      ? -translate || 0
      : translate;
    return {
      translate: snapshotTranslate,
      transitionDuration,
      activeIndex,
      realIndex: loopOrder[activeIndex] ?? activeIndex,
      previousIndex,
      progress,
      progressLoop,
      size: containerSize,
      virtualSize,
      isBeginning,
      isEnd,
      touching,
      animating,
      allowClick,
      startTranslate,
      snapIndex: snapIndexOf(snapGrid, snapshotTranslate),
      swipeDirection: gesture.swipeDirection,
      touches: {
        startX: gesture.startX,
        startY: gesture.startY,
        currentX: gesture.currentX,
        currentY: gesture.currentY,
        diff: gesture.diff,
      },
      isLocked: snapGrid.length <= 1,
      breakpoint: currentBreakpoint,
      slidesSizesGrid,
      slidesGrid,
      snapGrid,
      slides: computedSlides,
      virtual,
      scrollSnapTarget: scrollSnapTargetPending,
      cssModeCenteredOffset,
      layout: {
        direction: params.direction,
        rtl: params.rtl,
        cssMode: params.cssMode,
        centeredSlides: params.centeredSlides,
        freeMode: params.freeMode,
        virtual: params.virtual,
        loop: params.loop,
        rewind: params.rewind,
        autoHeight: params.autoHeight,
        slidesPerView: params.slidesPerView,
      },
    };
  }

  const store = createStore<T>(buildSnapshot());
  const eventListeners = new Set<(name: string, arg?: number) => void>();
  const emitEvent = (name: string, arg?: number): void => {
    for (const l of eventListeners) l(name, arg);
  };
  let lastEmitted: EngineState<T> | null = null;
  let suppressDiff = false;
  const commit = (): void => {
    const snap = buildSnapshot();
    store.set(snap);
    const prev = lastEmitted;
    lastEmitted = snap;
    if (!suppressDiff) for (const ev of diffEvents(prev, snap)) emitEvent(ev.name, ev.arg);
  };

  // Rebuild the geometry grids only (NO active/translate re-snap). Called both from
  // recompute() and directly after a loop reorder, where the caller's applySlideTo
  // does the snap. For 'auto', measuredSizes is keyed by real slide index, so reorder
  // it to layout positions via loopOrder; numeric slidesPerView ignores sizes.
  function rebuildGrid(): void {
    cssModeCenteredOffset = null;
    if (containerSize > 0 && slides.length > 0) {
      const orderedSizes =
        params.slidesPerView === 'auto'
          ? loopOrder.map((realIdx) => measuredSizes[realIdx] ?? 0)
          : measuredSizes;
      const g = computeGeometry(slides.length, containerSize, params, orderedSizes);
      slidesSizesGrid = g.slidesSizesGrid;
      slidesGrid = g.slidesGrid;
      snapGrid = g.snapGrid;
      offsetsGrid = g.offsetsGrid;
      virtualSize = g.virtualSize;
      // Port of updateSlides.ts centered+cssMode: shift grids to origin and expose
      // the centered offsets for the adapter's CSS vars.
      if (params.cssMode && params.centeredSlides && slidesSizesGrid.length > 0) {
        const before = -snapGrid[0];
        const after = containerSize / 2 - slidesSizesGrid[slidesSizesGrid.length - 1] / 2;
        const addSnap = -snapGrid[0];
        const addSlides = -slidesGrid[0];
        snapGrid = snapGrid.map((v) => v + addSnap);
        slidesGrid = slidesGrid.map((v) => v + addSlides);
        cssModeCenteredOffset = { before, after };
      }
    } else {
      slidesSizesGrid = [];
      slidesGrid = [];
      snapGrid = [0];
      offsetsGrid = [0];
      virtualSize = 0;
    }
  }

  function recompute(): void {
    rebuildGrid();
    // Re-snap the current active index onto the new grid.
    const target = resolveSlideTo(activeIndex, { params, snapGrid, slidesGrid });
    activeIndex = target.slideIndex;
    translate = target.translate;
    transitionDuration = 0;
  }

  function slideCtx() {
    return { params, snapGrid, slidesGrid };
  }

  // Direction locks (port of frozen allowSlideNext/allowSlidePrev, slideTo.ts:73-91):
  // a programmatic move is blocked when it would travel toward a disabled direction.
  // Resolving the target slideIndex makes this clamp-aware (a move that lands on the
  // current slide is "no movement" and always allowed) and rtl-safe (direction is
  // index-based, not translate-based, so the rtl translate sign-flip is irrelevant).
  function directionAllowed(targetIndex: number): boolean {
    if (params.allowSlideNext && params.allowSlidePrev) return true;
    const { slideIndex } = resolveSlideTo(targetIndex, slideCtx());
    if (slideIndex === activeIndex) return true;
    return slideIndex > activeIndex ? params.allowSlideNext : params.allowSlidePrev;
  }

  function loopSlidesPerView(): number {
    if (typeof params.slidesPerView === 'number') return Math.ceil(params.slidesPerView);
    // Port of frozen loopFix.ts: 'auto' uses the actual visible slide count so the
    // loop fix triggers early enough to keep the active slide flush with the left edge.
    return Math.ceil(slidesPerViewDynamic('current', false, spvCtx()));
  }
  function applyLoopFix(direction: 'next' | 'prev'): boolean {
    const fix = computeLoopFix({
      order: loopOrder,
      activeIndex,
      slidesGrid,
      slidesPerView: loopSlidesPerView(),
      params,
      direction,
    });
    if (!fix) return false;
    emitEvent('beforeLoopFix');
    loopOrder = fix.order;
    rebuildGrid(); // grid must follow the rotated order ('auto' has variable widths)
    emitEvent('loopFix');
    suppressDiff = true;
    applySlideTo(fix.repositionIndex, 0); // commit 1: reposition baseline (duration 0)
    suppressDiff = false;
    return true;
  }

  function spvCtx() {
    return {
      slidesPerView: params.slidesPerView,
      centeredSlides: params.centeredSlides,
      slidesGrid,
      slidesSizesGrid,
      containerSize,
      activeIndex,
    };
  }

  function gestureEnv(): GestureEnv {
    const { isBeginning, isEnd } = computeProgress(translate, snapGrid);
    return {
      params,
      translate,
      minTranslate: minTranslate(snapGrid),
      maxTranslate: maxTranslate(snapGrid),
      slidesGrid,
      slidesSizesGrid,
      activeIndex,
      loopOrder,
      slidesLength: slides.length,
      isBeginning,
      isEnd,
    };
  }

  function applySlideTo(index: number, speed: number): void {
    pendingBounce = null;
    const prevActive = activeIndex;
    const target = resolveSlideTo(index, slideCtx());
    const moved = target.translate !== translate;
    const isTransition = speed > 0 && moved;
    const emitTransition = isTransition && !params.cssMode;
    const changed = target.slideIndex !== prevActive;
    if (emitTransition) {
      lastTransitionDir = changed ? (target.slideIndex > prevActive ? 'next' : 'prev') : 'reset';
      emitEvent('beforeTransitionStart');
      emitEvent('transitionStart');
      if (changed) emitEvent('beforeSlideChangeStart');
    }
    previousIndex = prevActive;
    translate = target.translate;
    activeIndex = target.slideIndex;
    transitionDuration = speed;
    if (isTransition) animating = true;
    if (params.cssMode) scrollSnapTargetPending = { translate: target.translate, speed };
    commit();
    if (params.cssMode) scrollSnapTargetPending = null;
    if (emitTransition) {
      if (changed) {
        emitEvent('slideChangeTransitionStart');
        emitEvent(
          lastTransitionDir === 'next' ? 'slideNextTransitionStart' : 'slidePrevTransitionStart',
        );
      } else {
        emitEvent('slideResetTransitionStart');
      }
    }
  }

  // cssMode non-loop: resolve the target snap and emit it for the adapter to scroll
  // to, WITHOUT committing translate/activeIndex — the scroll feedback (setTranslate)
  // is the sole committer (faithful to frozen slideTo's cssMode branch).
  function emitScrollTarget(index: number, speed: number): void {
    const target = resolveSlideTo(index, slideCtx());
    scrollSnapTargetPending = { translate: target.translate, speed };
    commit();
    scrollSnapTargetPending = null;
  }

  function applyFreeTranslate(nextTranslate: number, duration: number): void {
    translate = nextTranslate;
    transitionDuration = duration;
    previousIndex = activeIndex;
    activeIndex = activeIndexByTranslate(translate, slidesGrid, params);
    commit();
  }

  function buildFreeModeInput(endTime: number): FreeModeInput {
    return {
      velocities: gesture.velocities.map((v) => ({ ...v })),
      endTime,
      touchStartTime: gesture.touchStartTime,
      translate,
      minTranslate: minTranslate(snapGrid),
      maxTranslate: maxTranslate(snapGrid),
      snapGrid,
      slidesGrid,
      slidesSizesGrid,
      slidesLength: slides.length,
      activeIndex,
      swipeDirection: gesture.swipeDirection,
      params,
    };
  }

  function toBatch(input: SlideInput<T> | SlideInput<T>[]): SlideInput<T>[] {
    return Array.isArray(input) ? input.slice() : [input];
  }

  // Splice the data set, reset loop order to identity over the new set, recompute
  // geometry, and re-snap to the preserved active slide. Loop re-derivation lands
  // in Task 4; this non-loop form generalizes setSlides.
  function applyMutation(nextSlides: SlideInput<T>[], nextActive: number): void {
    flushPending();
    touching = false;
    pendingBounce = null;
    slides = nextSlides;
    loopOrder = slides.map((_, i) => i);
    recompute();
    if (slides.length === 0) {
      // Preserve nextActive so that a subsequent insert can re-snap to the same position,
      // matching the frozen oracle's removeAllSlides → appendSlide round-trip behavior.
      // Under loop, the oracle calls slideTo(newActiveIndex + loopedSlidesCount) after
      // recalcSlidesAndUpdate. The engine's nextActive is derived from the real slide
      // index (loopOrder[activeIndex]), which already encodes the loop offset — so
      // nextActive directly equals the oracle's (newActiveIndex + loopedSlidesCount)
      // and no further adjustment is needed. Using nextActive for both loop and
      // non-loop keeps the formula uniform and oracle-verified.
      activeIndex = nextActive;
      translate = 0;
      transitionDuration = 0;
      commit();
      return;
    }
    const clamped = Math.min(Math.max(nextActive, 0), slides.length - 1);
    // Mirror the oracle's mutation path: after recalcSlidesAndUpdate, the oracle
    // calls slideTo(newActiveIndex + loopedSlides) — a standard snap, no loop
    // rotation. applySlideTo (via resolveSlideTo) handles end-clamping
    // (e.g. slidesPerView > 1) exactly as the oracle does, for both loop and
    // non-loop. loopOrder was reset to identity above, so position === real index.
    applySlideTo(clamped, 0);
  }

  // Insert `items` at `pos`. `includeEqual` chooses the active-shift boundary:
  // true → shift when pos <= active (insertSlides/prepend), false → shift when
  // pos < active (addSlide's strict frozen rule).
  // When inserting into an empty slides array the insertion position is always 0
  // and there is no meaningful "before/after active" split, so we skip the shift
  // and just re-snap to the existing activeIndex (mirrors the oracle's update()
  // call after appendSlide on an initially-empty surfer).
  function insertAt(pos: number, items: SlideInput<T>[], includeEqual: boolean): void {
    if (items.length === 0) return;
    const baseActive = params.loop ? (loopOrder[activeIndex] ?? activeIndex) : activeIndex;
    const next = slides.slice();
    next.splice(pos, 0, ...items);
    const shift = slides.length > 0 && (includeEqual ? pos <= baseActive : pos < baseActive);
    applyMutation(next, shift ? baseActive + items.length : baseActive);
  }

  // The rotation core of slideToLoop. Separated so that the public slideToLoop
  // method can flush any pending wrap first (flushPending) before delegating here.
  // Has exactly one caller: the public slideToLoop method.
  function slideToLoopInternal(realIndex: number, speed: number): void {
    if (!params.loop) {
      applySlideTo(realIndex, speed);
      return;
    }
    const spv = loopSlidesPerView();
    const tgt = slideToLoopTarget(realIndex, {
      order: loopOrder,
      activeIndex,
      slidesPerView: spv,
      params,
    });
    let fixed = false;
    if (tgt.needFix) {
      const fix = computeLoopFix({
        order: loopOrder,
        activeIndex,
        slidesGrid,
        slidesPerView: spv,
        params,
        direction: tgt.direction,
        activeSlideIndex: tgt.activeSlideIndex,
        slideRealIndex: tgt.direction === 'next' ? loopOrder[activeIndex] : undefined,
      });
      if (fix) {
        loopOrder = fix.order;
        rebuildGrid(); // grid must follow the rotated order ('auto' has variable widths)
        suppressDiff = true;
        applySlideTo(fix.repositionIndex, 0);
        suppressDiff = false;
        fixed = true;
      }
    }
    const target = loopOrder.indexOf(realIndex);
    if (fixed) scheduleFinal(() => applySlideTo(target, speed));
    else applySlideTo(target, speed);
  }

  return {
    setSlides(next) {
      slides = next.slice();
      loopOrder = slides.map((_, i) => i);
      recompute();
      commit();
    },
    // `sizes` (slidesPerView:'auto' only) is keyed by REAL slide index, not layout
    // position: sizes[realIndex] = that slide's measured size. The engine reorders it
    // through loopOrder internally, so callers feed a stable real-index array that
    // never goes stale when loop rotation changes the layout order.
    setGeometry({ containerSize: size, sizes }) {
      containerSize = size;
      measuredSizes = sizes ? sizes.slice() : [];
      recompute();
      commit();
      emitEvent('update');
    },
    recompute() {
      recompute();
      commit();
    },
    setParams(next) {
      const { breakpoints: bp, ...rest } = next;
      if (bp !== undefined) breakpoints = bp;
      baseParams = { ...baseParams, ...rest };
      currentBreakpoint = currentDims ? resolveBreakpoint(breakpoints, currentDims) : undefined;
      const applied = currentBreakpoint && breakpoints ? breakpoints[currentBreakpoint] : undefined;
      params = normalizeParams(mergeBreakpointParams(baseParams, applied));
      recompute();
      commit();
    },
    setBreakpointDimensions(dims) {
      currentDims = dims;
      const key = resolveBreakpoint(breakpoints, dims);
      if (key === currentBreakpoint) return;
      currentBreakpoint = key;
      const applied = key && breakpoints ? breakpoints[key] : undefined;
      params = normalizeParams(mergeBreakpointParams(baseParams, applied));
      recompute();
      commit();
    },
    insertSlides(at, input) {
      const pos = Math.min(Math.max(at, 0), slides.length);
      insertAt(pos, toBatch(input), true);
    },
    removeSlides(indexes) {
      const list = (Array.isArray(indexes) ? indexes : [indexes]).filter(
        (i) => Number.isInteger(i) && i >= 0 && i < slides.length,
      );
      if (list.length === 0) return;
      const remove = new Set(list);
      const baseActive = params.loop ? (loopOrder[activeIndex] ?? activeIndex) : activeIndex;
      // Use a shifting comparison (like the frozen oracle's removeSlide loop) so that
      // removing multiple slides below the active index produces the same nextActive as
      // the oracle's sequential decrement against the current newActiveIndex.
      let nextActive = baseActive;
      remove.forEach((i) => {
        if (i < nextActive) nextActive -= 1;
      });
      applyMutation(
        slides.filter((_, i) => !remove.has(i)),
        Math.max(nextActive, 0),
      );
    },
    clearSlides() {
      // Always resets activeIndex to 0 (hard reset), unlike removeAllSlides which
      // preserves the oracle's running-decrement value. The empty-state activeIndex
      // is read by insertAt on the next re-add, so the two methods leave the surfer
      // in a different position after a subsequent batch appendSlide.
      applyMutation([], 0);
    },
    appendSlide(input) {
      insertAt(slides.length, toBatch(input), true);
    },
    prependSlide(input) {
      insertAt(0, toBatch(input), true);
    },
    addSlide(index, input) {
      if (index <= 0) {
        insertAt(0, toBatch(input), true);
        return;
      }
      if (index >= slides.length) {
        insertAt(slides.length, toBatch(input), true);
        return;
      }
      insertAt(index, toBatch(input), false); // strict: shift only when index < active
    },
    removeSlide(indexes) {
      this.removeSlides(indexes);
    },
    removeAllSlides() {
      // Delegate to removeSlides so that the activeIndex shifting algorithm matches
      // the frozen oracle's removeAllSlides → removeSlide([0..n]) → slideTo path.
      this.removeSlides(slides.map((_, i) => i));
    },
    slideTo(index, opts) {
      flushPending();
      if (!directionAllowed(index)) return;
      const speed = opts?.speed ?? params.speed;
      if (params.cssMode && !params.loop) {
        emitScrollTarget(index, speed);
        return;
      }
      applySlideTo(index, speed);
    },
    slideNext(opts) {
      flushPending();
      // loopPreventsSliding (port of slideNext.ts:25 / slidePrev.ts:23): a loop transition
      // in flight blocks further nav until it settles. Virtual is exempt (frozen `!isVirtual`).
      if (params.loop && !params.virtual && params.loopPreventsSliding && animating) return;
      const speed = opts?.speed ?? params.speed;
      // WARNING: rewind is intended mutually-exclusive with loop (spec-deferred combo).
      // With both set, this checks isEnd before applyLoopFix while the frozen oracle
      // checks after its loopFix — unsupported; expect unexpected behavior / oracle drift.
      if (params.rewind && computeProgress(translate, snapGrid).isEnd) {
        // rewind from the end jumps back to slide 0 — a "prev"-direction move.
        if (!directionAllowed(0)) return;
        if (params.cssMode) emitScrollTarget(0, speed);
        else applySlideTo(0, speed);
        return;
      }
      // A normal slideNext is unconditionally "next"; bail before any loopFix work.
      if (!params.allowSlideNext) return;
      const fixed = params.loop ? applyLoopFix('next') : false;
      let perGroup = params.slidesPerGroup;
      if (
        params.slidesPerView === 'auto' &&
        params.slidesPerGroup === 1 &&
        params.slidesPerGroupAuto
      ) {
        perGroup = Math.max(slidesPerViewDynamic('current', true, spvCtx()), 1);
      }
      const increment = activeIndex < params.slidesPerGroupSkip ? 1 : perGroup;
      const target = activeIndex + increment;
      if (params.cssMode && !params.loop) {
        emitScrollTarget(target, speed);
        return;
      }
      if (fixed) scheduleFinal(() => applySlideTo(target, speed));
      else applySlideTo(target, speed);
    },
    slidePrev(opts) {
      flushPending();
      // loopPreventsSliding (port of slideNext.ts:25 / slidePrev.ts:23): a loop transition
      // in flight blocks further nav until it settles. Virtual is exempt (frozen `!isVirtual`).
      if (params.loop && !params.virtual && params.loopPreventsSliding && animating) return;
      const speed = opts?.speed ?? params.speed;
      // WARNING: rewind+loop is unsupported (see slideNext) — may diverge from the oracle.
      if (params.rewind && computeProgress(translate, snapGrid).isBeginning) {
        // rewind from the beginning jumps to the last slide — a "next"-direction move.
        if (!directionAllowed(slides.length - 1)) return;
        if (params.cssMode) emitScrollTarget(slides.length - 1, speed);
        else applySlideTo(slides.length - 1, speed);
        return;
      }
      // A normal slidePrev is unconditionally "prev"; bail before any loopFix work.
      if (!params.allowSlidePrev) return;
      const fixed = params.loop ? applyLoopFix('prev') : false;
      let prevIndex = resolveSlidePrev(translate, slideCtx());
      if (
        params.slidesPerView === 'auto' &&
        params.slidesPerGroup === 1 &&
        params.slidesPerGroupAuto
      ) {
        // The oracle applies this only when a prev snap exists; here it runs
        // unconditionally, which is equivalent under this gate: slidesPerGroup===1
        // means a per-slide snap grid, so the only no-prev-snap case is
        // activeIndex===0, where slidesPerViewDynamic('previous')===1 makes the
        // adjustment 0 - 1 + 1 = 0 — the same result.
        prevIndex = Math.max(prevIndex - slidesPerViewDynamic('previous', true, spvCtx()) + 1, 0);
      }
      if (params.cssMode && !params.loop) {
        emitScrollTarget(prevIndex, speed);
        return;
      }
      if (fixed) scheduleFinal(() => applySlideTo(prevIndex, speed));
      else applySlideTo(prevIndex, speed);
    },
    slideToLoop(realIndex, opts) {
      flushPending();
      slideToLoopInternal(realIndex, opts?.speed ?? params.speed);
    },
    setProgress(progress) {
      flushPending();
      pendingBounce = null;
      const min = minTranslate(snapGrid);
      const max = maxTranslate(snapGrid);
      const p = Math.max(0, Math.min(1, progress));
      applyFreeTranslate(min + (max - min) * p, 0);
    },
    setTranslate(nextTranslate, opts) {
      flushPending();
      pendingBounce = null;
      applyFreeTranslate(nextTranslate, opts?.speed ?? 0);
    },
    slideToClosest(opts) {
      flushPending();
      const index = closestSlideIndex({
        activeIndex,
        translate,
        snapGrid,
        slidesGrid,
        slidesPerGroup: params.slidesPerGroup,
        slidesPerGroupSkip: params.slidesPerGroupSkip,
        threshold: opts?.threshold,
      });
      applySlideTo(index, opts?.speed ?? params.speed);
    },
    pointerStart(sample: PointerSample) {
      if (params.cssMode) return;
      // Only the drag *start* flushes a pending wrap: beginning a gesture settles any
      // in-flight programmatic wrap first, so pointerEnd can never meet a strand. When
      // drag-loop lands (loopFix on release), that release path must add its own
      // flush/guard — the asymmetry here is intentional for the programmatic-only scope.
      flushPending();
      pendingBounce = null;
      touching = true;
      allowClick = true;
      startTranslate = translate;
      gestureStart(gesture, sample);
      commit();
    },
    pointerMove(sample: PointerSample) {
      if (params.cssMode) return { moved: false, scrolling: false };
      const r = gestureMove(gesture, sample, gestureEnv());
      if (r === null) return { moved: false, scrolling: !!gesture.isScrolling };
      if (gesture.isMoved) allowClick = false;
      if (r.order) {
        emitEvent('beforeLoopFix');
        loopOrder = r.order;
        // A drag wrap rotates the order, so the grid must follow it (as every other reorder
        // path does — slideToLoop, nav). Else for 'auto' the slide sizes/positions — and the
        // visibility flags derived from them — go stale. Only the geometry is rebuilt; the
        // drag translate (r.translate) is preserved below.
        rebuildGrid();
        emitEvent('loopFix');
      }
      if (!r.hold) {
        translate = r.translate;
        transitionDuration = 0;
      }
      commit();
      return { moved: !r.hold, scrolling: false };
    },
    pointerEnd(sample: PointerSample) {
      if (params.cssMode) return;
      touching = false;
      if (params.freeMode) {
        pendingBounce = null;
        const r = freeModeRelease(buildFreeModeInput(sample.time));
        gesture.velocities.length = 0;
        if (r.kind === 'slideTo') {
          applySlideTo(r.index, r.speed);
        } else if (r.kind === 'static') {
          applyFreeTranslate(translate, 0);
        } else if (r.kind === 'momentum') {
          applyFreeTranslate(r.translate, r.transitionDuration);
        } else {
          pendingBounce = {
            afterBouncePosition: r.afterBouncePosition,
            settleSpeed: r.settleSpeed,
          };
          applyFreeTranslate(r.translate, r.transitionDuration);
        }
        return;
      }
      const target = gestureEnd(gesture, gestureEnv(), sample.time);
      if (target === null) {
        commit();
        return;
      }
      applySlideTo(target, params.speed);
    },
    onTransitionEnd() {
      animating = false;
      const dir = lastTransitionDir;
      lastTransitionDir = null;
      if (dir) {
        emitEvent('transitionEnd');
        if (dir === 'reset') {
          emitEvent('slideResetTransitionEnd');
        } else {
          emitEvent('slideChangeTransitionEnd');
          emitEvent(dir === 'next' ? 'slideNextTransitionEnd' : 'slidePrevTransitionEnd');
        }
      }
      if (!pendingBounce) {
        commit();
        return;
      }
      emitEvent('momentumBounce');
      const settle = pendingBounce;
      pendingBounce = null;
      applyFreeTranslate(settle.afterBouncePosition, settle.settleSpeed);
    },
    get state() {
      return store.get();
    },
    get params() {
      return params;
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    onEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    destroy() {
      slides = [];
      store.clear();
      eventListeners.clear();
    },
  };
}
