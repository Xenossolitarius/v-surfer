import type {
  CenteredInput,
  EngineParams,
  EngineParamsInput,
  FreeModeInput,
  GroupInput,
  GroupedParamsInput,
  LoopInput,
  TouchInput,
  VirtualInput,
} from './types';

const DEFAULTS: EngineParams = {
  slidesPerView: 1,
  direction: 'horizontal',
  rtl: false,
  loop: false,
  rewind: false,
  loopAdditionalSlides: 0,
  spaceBetween: 0,
  speed: 300,
  initialSlide: 0,
  slidesPerGroup: 1,
  slidesPerGroupSkip: 0,
  slidesPerGroupAuto: false,
  centeredSlides: false,
  centerInsufficientSlides: false,
  centeredSlidesBounds: false,
  loopPreventsSliding: true,
  roundLengths: false,
  autoHeight: false,
  freeMode: false,
  freeModeMomentum: true,
  freeModeMomentumRatio: 1,
  freeModeMomentumVelocityRatio: 1,
  freeModeMomentumBounce: true,
  freeModeMomentumBounceRatio: 1,
  freeModeSticky: false,
  freeModeMinimumVelocity: 0.02,
  normalizeSlideIndex: true,
  allowTouchMove: true,
  allowSlideNext: true,
  allowSlidePrev: true,
  simulateTouch: true,
  touchRatio: 1,
  touchAngle: 45,
  touchReleaseOnEdges: false,
  threshold: 5,
  resistance: true,
  resistanceRatio: 0.85,
  followFinger: true,
  shortSwipes: true,
  longSwipes: true,
  longSwipesMs: 300,
  longSwipesRatio: 0.5,
  oneWayMovement: false,
  cssMode: false,
  virtual: false,
  addSlidesBefore: 0,
  addSlidesAfter: 0,
  virtualAutoSlidesPerView: 0,
};

/**
 * Collapse one-level-nested group inputs (loop/freeMode/virtual/centered/group/touch)
 * into the flat fields the engine reads. Idempotent: flat-only input passes through
 * unchanged (a `boolean` group key is already the flat `enabled` value). An explicit
 * flat field in `input` wins over a nested-derived one (a sub-field is only applied when
 * its flat key is absent from `input`). A group object's `enabled` defaults to `true`
 * (so `loop: {}` / `loop: { additionalSlides: 2 }` enable looping).
 */
export function flattenGroups(input: GroupedParamsInput): EngineParamsInput {
  const out: Record<string, unknown> = { ...input };
  // Apply a nested sub-field only if the consumer did not also set the flat key explicitly.
  const setIf = (key: string, v: unknown): void => {
    if (v !== undefined && !(key in input)) out[key] = v;
  };

  if (typeof out.loop === 'object' && out.loop !== null) {
    const g = out.loop as LoopInput;
    out.loop = g.enabled ?? true;
    setIf('loopAdditionalSlides', g.additionalSlides);
    setIf('loopPreventsSliding', g.preventsSliding);
  }
  if (typeof out.freeMode === 'object' && out.freeMode !== null) {
    const g = out.freeMode as FreeModeInput;
    out.freeMode = g.enabled ?? true;
    setIf('freeModeMomentum', g.momentum);
    setIf('freeModeMomentumRatio', g.momentumRatio);
    setIf('freeModeMomentumVelocityRatio', g.momentumVelocityRatio);
    setIf('freeModeMomentumBounce', g.momentumBounce);
    setIf('freeModeMomentumBounceRatio', g.momentumBounceRatio);
    setIf('freeModeSticky', g.sticky);
    setIf('freeModeMinimumVelocity', g.minimumVelocity);
  }
  if (typeof out.virtual === 'object' && out.virtual !== null) {
    const g = out.virtual as VirtualInput;
    out.virtual = g.enabled ?? true;
    setIf('addSlidesBefore', g.addSlidesBefore);
    setIf('addSlidesAfter', g.addSlidesAfter);
    setIf('virtualAutoSlidesPerView', g.autoSlidesPerView);
  }
  // centered / group / touch are NEW keys (no flat name collision) — delete after expanding.
  if ('centered' in out) {
    const c = out.centered;
    if (typeof c === 'object' && c !== null) {
      const g = c as CenteredInput;
      setIf('centeredSlides', g.enabled ?? true);
      setIf('centerInsufficientSlides', g.insufficientSlides);
      setIf('centeredSlidesBounds', g.bounds);
    } else {
      setIf('centeredSlides', c);
    }
    delete out.centered;
  }
  if (typeof out.group === 'object' && out.group !== null) {
    const g = out.group as GroupInput;
    setIf('slidesPerGroup', g.perGroup);
    setIf('slidesPerGroupSkip', g.skip);
    setIf('slidesPerGroupAuto', g.auto);
    delete out.group;
  }
  if (typeof out.touch === 'object' && out.touch !== null) {
    const g = out.touch as TouchInput;
    setIf('allowTouchMove', g.allow);
    setIf('simulateTouch', g.simulate);
    setIf('touchRatio', g.ratio);
    setIf('touchAngle', g.angle);
    setIf('touchReleaseOnEdges', g.releaseOnEdges);
    setIf('threshold', g.threshold);
    setIf('followFinger', g.followFinger);
    delete out.touch;
  }
  return out as EngineParamsInput;
}

/** Merge consumer input over the Phase-1 defaults into a fully-resolved param set. */
export function normalizeParams(input: GroupedParamsInput): EngineParams {
  // Collapse nested groups to flat fields first, so the resolved set is purely flat.
  const merged: EngineParamsInput = { ...DEFAULTS, ...flattenGroups(input) };
  // `breakpoints` is layered by the engine, not part of the resolved per-field set.
  delete merged.breakpoints;
  return merged as EngineParams;
}
