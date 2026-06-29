import { describe, it, expect } from 'vitest';
import { flattenGroups, normalizeParams } from '../../src/headless/params';
import { createEngine } from '../../src/headless/engine';

describe('flattenGroups — nested groups collapse to flat fields', () => {
  it('loop object → loop boolean + flat sub-fields (enabled defaults true)', () => {
    expect(flattenGroups({ loop: { additionalSlides: 2, preventsSliding: false } })).toEqual({
      loop: true,
      loopAdditionalSlides: 2,
      loopPreventsSliding: false,
    });
    expect(flattenGroups({ loop: { enabled: false } })).toEqual({ loop: false });
    expect(flattenGroups({ loop: {} })).toEqual({ loop: true });
  });

  it('freeMode object → freeMode boolean + flat momentum/sticky fields', () => {
    expect(flattenGroups({ freeMode: { sticky: true, momentumRatio: 0.5 } })).toEqual({
      freeMode: true,
      freeModeSticky: true,
      freeModeMomentumRatio: 0.5,
    });
  });

  it('virtual object → virtual boolean + addSlidesBefore/After + autoSlidesPerView', () => {
    expect(flattenGroups({ virtual: { addSlidesBefore: 1, autoSlidesPerView: 3 } })).toEqual({
      virtual: true,
      addSlidesBefore: 1,
      virtualAutoSlidesPerView: 3,
    });
  });

  it('centered / group / touch new keys expand and are removed', () => {
    expect(flattenGroups({ centered: { insufficientSlides: true } })).toEqual({
      centeredSlides: true,
      centerInsufficientSlides: true,
    });
    expect(flattenGroups({ centered: true })).toEqual({ centeredSlides: true });
    expect(flattenGroups({ group: { perGroup: 2, skip: 1, auto: true } })).toEqual({
      slidesPerGroup: 2,
      slidesPerGroupSkip: 1,
      slidesPerGroupAuto: true,
    });
    expect(flattenGroups({ touch: { allow: false, ratio: 2, threshold: 8 } })).toEqual({
      allowTouchMove: false,
      touchRatio: 2,
      threshold: 8,
    });
  });

  it('is idempotent on flat-only input (boolean group keys pass through)', () => {
    const flat = { loop: true, freeMode: false, virtual: true, slidesPerGroup: 3, threshold: 10 };
    expect(flattenGroups({ ...flat })).toEqual(flat);
  });

  it('an explicit flat field wins over a nested-derived one', () => {
    expect(flattenGroups({ loop: { additionalSlides: 2 }, loopAdditionalSlides: 9 })).toEqual({
      loop: true,
      loopAdditionalSlides: 9,
    });
  });

  it('does not mutate the caller input', () => {
    const input = { loop: { additionalSlides: 2 } };
    flattenGroups(input);
    expect(input).toEqual({ loop: { additionalSlides: 2 } });
  });
});

describe('normalizeParams — grouped input resolves to flat defaults', () => {
  it('fills defaults and applies the group', () => {
    const p = normalizeParams({ freeMode: { sticky: true }, group: { perGroup: 2 } });
    expect(p.freeMode).toBe(true);
    expect(p.freeModeSticky).toBe(true);
    expect(p.slidesPerGroup).toBe(2);
    // untouched fields keep defaults
    expect(p.slidesPerView).toBe(1);
    expect(p.freeModeMomentum).toBe(true);
  });
});

describe('createEngine accepts grouped input (back-compat: flat still works)', () => {
  function withSlides(engine: ReturnType<typeof createEngine>) {
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: i })));
    return engine;
  }

  it('grouped loop produces the same resolved params as the flat form', () => {
    const grouped = withSlides(createEngine({ loop: { additionalSlides: 2 } }));
    const flat = withSlides(createEngine({ loop: true, loopAdditionalSlides: 2 }));
    expect(grouped.params.loop).toBe(true);
    expect(grouped.params.loopAdditionalSlides).toBe(2);
    expect(grouped.params.loopAdditionalSlides).toBe(flat.params.loopAdditionalSlides);
  });

  it('grouped touch/centered feed the engine params', () => {
    const engine = withSlides(
      createEngine({ touch: { threshold: 12, ratio: 2 }, centered: { enabled: true } }),
    );
    expect(engine.params.threshold).toBe(12);
    expect(engine.params.touchRatio).toBe(2);
    expect(engine.params.centeredSlides).toBe(true);
  });

  it('setParams accepts grouped input at runtime', () => {
    const engine = withSlides(createEngine({}));
    expect(engine.params.freeMode).toBe(false);
    engine.setParams({ freeMode: { sticky: true } });
    expect(engine.params.freeMode).toBe(true);
    expect(engine.params.freeModeSticky).toBe(true);
  });
});
