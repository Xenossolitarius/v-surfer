import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { freeModeRelease, type FreeModeInput } from '../../src/headless/free-mode';
import { normalizeParams } from '../../src/headless/params';

function setup(count = 5, params = { slidesPerView: 1 }) {
  const engine = createEngine<{ n: number }>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: { n: i } })));
  return engine;
}

describe('createEngine', () => {
  it('computes initial geometry + state', () => {
    const s = setup().state;
    expect(s.translate).toBe(0);
    expect(s.activeIndex).toBe(0);
    expect(s.isBeginning).toBe(true);
    expect(s.isEnd).toBe(false);
    expect(s.snapGrid).toEqual([0, 800, 1600, 2400, 3200]);
    expect(s.slides).toHaveLength(5);
    expect(s.slides[0]).toMatchObject({ index: 0, size: 800, offset: 0, isActive: true });
    expect(s.slides[1].isActive).toBe(false);
    // non-centered: physical offset == grid position, progress one step back is -1
    expect(s.slides[1]).toMatchObject({ offset: 800, progress: -1 });
  });

  it('slideTo updates translate, index, edges and notifies', () => {
    const engine = setup();
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.slideTo(4, { speed: 0 });
    expect(engine.state.translate).toBe(-3200);
    expect(engine.state.activeIndex).toBe(4);
    expect(engine.state.isEnd).toBe(true);
    expect(engine.state.transitionDuration).toBe(0);
    expect(listener).toHaveBeenCalledWith(engine.state);
  });

  it('slideNext / slidePrev step by one', () => {
    const engine = setup();
    engine.slideNext();
    expect(engine.state.activeIndex).toBe(1);
    expect(engine.state.transitionDuration).toBe(300);
    engine.slidePrev();
    expect(engine.state.activeIndex).toBe(0);
  });

  it('exposes a frozen snapshot', () => {
    const engine = setup();
    expect(Object.isFrozen(engine.state)).toBe(true);
  });

  it('pointer drag then release snaps to the next slide', () => {
    const engine = setup(5, { slidesPerView: 1, threshold: 0 });
    engine.pointerStart({ x: 500, y: 50, time: 0 });
    engine.pointerMove({ x: 300, y: 50, time: 16 }); // drag left 200
    expect(engine.state.touching).toBe(true);
    expect(engine.state.translate).toBe(-200);
    engine.pointerEnd({ x: 300, y: 50, time: 100 }); // quick → short swipe next
    expect(engine.state.activeIndex).toBe(1);
    expect(engine.state.translate).toBe(-800);
    expect(engine.state.touching).toBe(false);
  });

  it('annotates each slide with active/prev/next/visible flags', () => {
    const engine = setup(5, { slidesPerView: 1 });
    engine.slideTo(2, { speed: 0 });
    const s = engine.state.slides;
    expect(s[2].isActive).toBe(true);
    expect(s[1].isPrev).toBe(true);
    expect(s[3].isNext).toBe(true);
    expect(s[2].isVisible).toBe(true);
    expect(s[2].isFullyVisible).toBe(true);
    expect(s[0].isVisible).toBe(false);
    expect(s[0].isActive).toBe(false);
    // boundaries: the non-adjacent slide is neither prev nor next of the active one
    expect(s[0].isPrev).toBe(false);
    expect(s[4].isNext).toBe(false);
  });

  it("slidesPerView:'auto' builds non-uniform grids from injected sizes", () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 'auto' });
    engine.setGeometry({ containerSize: 600, sizes: [200, 300, 150, 400] });
    engine.setSlides(Array.from({ length: 4 }, (_, i) => ({ data: { n: i } })));

    const s = engine.state;
    expect(s.slidesSizesGrid).toEqual([200, 300, 150, 400]);
    expect(s.slidesGrid).toEqual([0, 200, 500, 650]);
    expect(s.snapGrid).toEqual([0, 200, 450]);
    expect(s.slides[1].size).toBe(300);
    expect(s.isBeginning).toBe(true);

    engine.slideTo(1, { speed: 0 });
    expect(engine.state.translate).toBe(-200);
    expect(engine.state.activeIndex).toBe(1);
  });

  it('centeredSlides centers the active slide', () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 3, centeredSlides: true });
    engine.setGeometry({ containerSize: 900 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: { n: i } })));

    const s = engine.state;
    expect(s.snapGrid).toEqual([-300, 0, 300, 600, 900]);
    // first slide centered: translate is the positive minTranslate, not 0
    expect(s.activeIndex).toBe(0);
    expect(s.translate).toBe(300);
    // exposed offset is the physical position (0), not the -300 grid position
    expect(s.slides[0].offset).toBe(0);
    expect(s.slides[0].isFullyVisible).toBe(true);
    // the centered active slide sits at progress 0 (centered origin cancels its offset)
    expect(s.slides[0].progress).toBe(0);

    engine.slideTo(2, { speed: 0 });
    expect(engine.state.activeIndex).toBe(2);
    expect(engine.state.translate).toBe(-300); // snapGrid[2] = 300 -> translate -300
    expect(engine.state.slides[2].progress).toBe(0); // newly-centered active slide
  });

  it('slidesPerGroupAuto pages slideNext/slidePrev by a screenful in auto mode', () => {
    const make = (groupAuto: boolean) => {
      const e = createEngine<{ n: number }>({
        slidesPerView: 'auto',
        slidesPerGroupAuto: groupAuto,
      });
      e.setGeometry({ containerSize: 350, sizes: Array.from({ length: 9 }, () => 100) });
      e.setSlides(Array.from({ length: 9 }, (_, i) => ({ data: { n: i } })));
      return e;
    };

    // 3 slides of 100px fit in 350px (strict-< right-edge test), so paging steps by 3.
    const paged = make(true);
    paged.slideNext({ speed: 0 });
    expect(paged.state.activeIndex).toBe(3);
    paged.slideNext({ speed: 0 });
    expect(paged.state.activeIndex).toBe(6);
    // Back near the clamped end: the core's forward/back asymmetry lands this on 2.
    paged.slidePrev({ speed: 0 });
    expect(paged.state.activeIndex).toBe(2);

    // Flag off => one slide at a time.
    const single = make(false);
    single.slideNext({ speed: 0 });
    expect(single.state.activeIndex).toBe(1);
  });
});

describe('engine freeMode release', () => {
  function freeEngine(count: number, extra: Record<string, unknown> = {}) {
    const engine = createEngine<number>({
      slidesPerView: 1,
      spaceBetween: 0,
      freeMode: true,
      threshold: 0,
      ...extra,
    });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
    return engine;
  }

  it('carries momentum past the release point and matches freeModeRelease', () => {
    const engine = freeEngine(5);
    engine.pointerStart({ x: 500, y: 100, time: 0 });
    engine.pointerMove({ x: 470, y: 100, time: 16 });
    const pre = engine.state; // translate after follow-finger (= -30)
    const input: FreeModeInput = {
      velocities: [
        { position: 500, time: 0 },
        { position: 470, time: 16 },
      ],
      endTime: 20,
      touchStartTime: 0,
      translate: pre.translate,
      minTranslate: 0,
      maxTranslate: -pre.snapGrid[pre.snapGrid.length - 1],
      snapGrid: pre.snapGrid.slice(),
      slidesGrid: pre.slidesGrid.slice(),
      slidesSizesGrid: pre.slidesSizesGrid.slice(),
      slidesLength: 5,
      activeIndex: pre.activeIndex,
      swipeDirection: 'next',
      params: normalizeParams({ slidesPerView: 1, spaceBetween: 0, freeMode: true }),
    };
    const expected = freeModeRelease(input);
    engine.pointerEnd({ x: 470, y: 100, time: 20 });
    expect(expected.kind).toBe('momentum');
    if (expected.kind === 'momentum') {
      expect(engine.state.translate).toBeCloseTo(expected.translate, 6);
      expect(engine.state.transitionDuration).toBeCloseTo(expected.transitionDuration, 6);
    }
    expect(engine.state.touching).toBe(false);
  });

  it('bounces past the end then settles on onTransitionEnd', () => {
    const engine = freeEngine(3, { resistance: false }); // maxTranslate -1600
    // Start mid-deck so the release stays in-bounds (a release past the end would hit
    // the overscroll clamp instead). From -800 a -1.5 flick projects to ~-2330 < -1600.
    engine.slideTo(1, { speed: 0 });
    engine.pointerStart({ x: 500, y: 100, time: 0 });
    engine.pointerMove({ x: 470, y: 100, time: 10 });
    engine.pointerEnd({ x: 470, y: 100, time: 14 });
    expect(engine.state.translate).toBeLessThan(-1600); // overshoot past maxTranslate
    expect(engine.state.transitionDuration).toBeGreaterThan(0);

    engine.onTransitionEnd();
    expect(engine.state.translate).toBe(-1600); // settled to the boundary
    expect(engine.state.transitionDuration).toBe(300); // params.speed

    const settled = engine.state.translate;
    engine.onTransitionEnd(); // no pending bounce → no-op
    expect(engine.state.translate).toBe(settled);
  });

  it('clears a pending bounce when a new navigation happens', () => {
    const engine = freeEngine(3, { resistance: false });
    engine.slideTo(1, { speed: 0 }); // in-bounds release so the flick bounces (see above)
    engine.pointerStart({ x: 500, y: 100, time: 0 });
    engine.pointerMove({ x: 470, y: 100, time: 10 });
    engine.pointerEnd({ x: 470, y: 100, time: 14 });
    expect(engine.state.translate).toBeLessThan(-1600); // confirm a bounce is pending
    engine.slideTo(0, { speed: 0 }); // supersede the bounce
    engine.onTransitionEnd(); // must NOT settle to the boundary
    expect(engine.state.activeIndex).toBe(0);
    expect(engine.state.translate).toBe(0);
  });

  it('non-freeMode pointerEnd still snaps (regression guard)', () => {
    const engine = createEngine<number>({ slidesPerView: 1, spaceBetween: 0, threshold: 0 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    engine.pointerStart({ x: 500, y: 100, time: 0 });
    engine.pointerMove({ x: 100, y: 100, time: 16 }); // long drag left
    engine.pointerEnd({ x: 100, y: 100, time: 100 });
    expect(engine.state.activeIndex).toBe(1);
    expect(engine.state.translate).toBe(-800); // landed on a snap, not a free position
  });
});

describe('realIndex foundation (non-loop is identity)', () => {
  it('exposes realIndex === activeIndex and per-slide realIndex === index when not looping', () => {
    const engine = createEngine<number>({ slidesPerView: 1 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    engine.slideTo(2, { speed: 0 });
    expect(engine.state.realIndex).toBe(2);
    expect(engine.state.activeIndex).toBe(2);
    expect(engine.state.slides.map((s) => s.realIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(engine.state.slides.map((s) => s.data)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('engine rtl', () => {
  function rtlEngine(count: number) {
    const engine = createEngine<number>({ slidesPerView: 1, spaceBetween: 0, rtl: true });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
    return engine;
  }

  it('exposes a sign-flipped translate matching the frozen rtl convention', () => {
    // 5 slides → snapGrid [0,800,1600,2400,3200], min 0, max -3200.
    const engine = rtlEngine(5);
    // initial: translate 0 either way
    expect(engine.state.translate).toBe(0);
    engine.slideTo(2, { speed: 0 });
    // canonical would be -1600; rtl exposes +1600 (probe-verified frozen value)
    expect(engine.state.translate).toBe(1600);
    expect(engine.state.activeIndex).toBe(2);
    expect(engine.state.progress).toBeCloseTo(0.5, 6); // 1600 / 3200
    expect(engine.state.slidesGrid[2]).toBe(1600); // grids stay positive/canonical
  });

  it('leaves a non-rtl engine translate negative (regression guard)', () => {
    const engine = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 8 }, (_, i) => ({ data: i })));
    engine.slideTo(2, { speed: 0 });
    expect(engine.state.translate).toBe(-1600);
  });
});
