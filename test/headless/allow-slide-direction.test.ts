import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { normalizeParams } from '../../src/headless/params';
import type { EngineParamsInput } from '../../src/headless/types';

// Port of frozen `allowSlideNext` / `allowSlidePrev` (src/core, gated in slideTo +
// onTouchMove). Direction locks: when a direction is disabled, neither a
// programmatic move nor a drag may travel that way; the opposite direction is
// unaffected. allowTouchMove (already ported) disables BOTH drag directions —
// these two disable a single direction each, for drag AND programmatic nav.

function setup(params: EngineParamsInput, count = 5) {
  const engine = createEngine<{ n: number }>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: { n: i } })));
  return engine;
}

describe('params defaults', () => {
  it('allowSlideNext / allowSlidePrev default to true', () => {
    const p = normalizeParams({});
    expect(p.allowSlideNext).toBe(true);
    expect(p.allowSlidePrev).toBe(true);
  });
});

describe('allowSlideNext: false — forward locked, backward free', () => {
  it('slideNext is a no-op', () => {
    const e = setup({ slidesPerView: 1, allowSlideNext: false });
    e.slideNext();
    expect(e.state.activeIndex).toBe(0);
    expect(e.state.translate).toBe(0);
  });

  it('a forward slideTo is a no-op', () => {
    const e = setup({ slidesPerView: 1, allowSlideNext: false });
    e.slideTo(3, { speed: 0 });
    expect(e.state.activeIndex).toBe(0);
    expect(e.state.translate).toBe(0);
  });

  it('backward nav still works (slidePrev and backward slideTo)', () => {
    const e = setup({ slidesPerView: 1, allowSlideNext: false, initialSlide: 2 });
    expect(e.state.activeIndex).toBe(2);
    e.slidePrev();
    expect(e.state.activeIndex).toBe(1);
    e.slideTo(0, { speed: 0 });
    expect(e.state.activeIndex).toBe(0);
  });

  it('a forward drag is pinned to the start translate', () => {
    const e = setup({ slidesPerView: 1, threshold: 0, allowSlideNext: false });
    e.pointerStart({ x: 500, y: 50, time: 0 });
    e.pointerMove({ x: 300, y: 50, time: 16 }); // drag left → "next" direction
    expect(e.state.translate).toBe(0); // pinned, not -200
    e.pointerEnd({ x: 300, y: 50, time: 100 });
    expect(e.state.activeIndex).toBe(0);
  });
});

describe('allowSlidePrev: false — backward locked, forward free', () => {
  it('slidePrev is a no-op', () => {
    const e = setup({ slidesPerView: 1, allowSlidePrev: false, initialSlide: 2 });
    e.slidePrev();
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.translate).toBe(-1600);
  });

  it('a backward slideTo is a no-op', () => {
    const e = setup({ slidesPerView: 1, allowSlidePrev: false, initialSlide: 2 });
    e.slideTo(0, { speed: 0 });
    expect(e.state.activeIndex).toBe(2);
  });

  it('forward nav still works (slideNext and forward slideTo)', () => {
    const e = setup({ slidesPerView: 1, allowSlidePrev: false, initialSlide: 2 });
    e.slideNext();
    expect(e.state.activeIndex).toBe(3);
    e.slideTo(4, { speed: 0 });
    expect(e.state.activeIndex).toBe(4);
  });

  it('a backward drag is pinned to the start translate', () => {
    const e = setup({ slidesPerView: 1, threshold: 0, allowSlidePrev: false, initialSlide: 2 });
    expect(e.state.translate).toBe(-1600);
    e.pointerStart({ x: 300, y: 50, time: 0 });
    e.pointerMove({ x: 500, y: 50, time: 16 }); // drag right → "prev" direction
    expect(e.state.translate).toBe(-1600); // pinned, not -1400
    e.pointerEnd({ x: 500, y: 50, time: 100 });
    expect(e.state.activeIndex).toBe(2);
  });
});

describe('both locked — slider is frozen in place', () => {
  it('neither drag direction moves the slider', () => {
    const e = setup({
      slidesPerView: 1,
      threshold: 0,
      allowSlideNext: false,
      allowSlidePrev: false,
      initialSlide: 2,
    });
    e.pointerStart({ x: 300, y: 50, time: 0 });
    e.pointerMove({ x: 100, y: 50, time: 16 }); // forward
    expect(e.state.translate).toBe(-1600);
    e.pointerEnd({ x: 100, y: 50, time: 100 });
    expect(e.state.activeIndex).toBe(2);
  });
});
