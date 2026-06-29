import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

describe('engine snapshot: size + virtualSize', () => {
  it('exposes container size and total content size', () => {
    const engine = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    // 5 slides of 800 (slidesPerView:1 → slideSize = containerSize), spaceBetween 0.
    expect(engine.state.size).toBe(800);
    expect(engine.state.virtualSize).toBe(4000);
  });

  it('reports zero size/virtualSize before geometry is measured', () => {
    const engine = createEngine<number>({ slidesPerView: 1 });
    engine.setSlides([{ data: 0 }]);
    expect(engine.state.size).toBe(0);
    expect(engine.state.virtualSize).toBe(0);
  });
});

describe('engine.setProgress', () => {
  function engine5() {
    const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    return e;
  }
  it('scrubs translate across the full range and updates activeIndex', () => {
    const e = engine5();
    // snapGrid [0,800,1600,2400,3200], min=0, max=-3200.
    e.setProgress(0);
    expect(e.state.translate).toBe(0);
    expect(e.state.activeIndex).toBe(0);
    e.setProgress(1);
    expect(e.state.translate).toBe(-3200);
    expect(e.state.activeIndex).toBe(4);
    e.setProgress(0.5);
    expect(e.state.translate).toBe(-1600);
    expect(e.state.activeIndex).toBe(2);
  });
  it('clamps progress into [0, 1]', () => {
    const e = engine5();
    e.setProgress(-5);
    expect(e.state.translate).toBe(0);
    e.setProgress(5);
    expect(e.state.translate).toBe(-3200);
  });
  it('does not transition (duration 0)', () => {
    const e = engine5();
    e.setProgress(0.5);
    expect(e.state.transitionDuration).toBe(0);
  });
});

describe('engine.slideToClosest', () => {
  it('snaps a free position to the nearest slide', () => {
    const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    // Free-scrub to 41% → translate -1312, activeIndex ~2 (1312 past 800+400).
    e.setProgress(0.41);
    e.slideToClosest({ speed: 0 });
    // Lands on a snap point (multiple of 800).
    expect(Math.abs(e.state.translate % 800)).toBe(0);
    expect([0, 1, 2, 3, 4]).toContain(e.state.activeIndex);
    // Specifically the closest: -1312 → nearest snap -1600 (index 2).
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.translate).toBe(-1600);
  });
});

describe('engine.slideToClosest threshold', () => {
  function engine5() {
    const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    return e;
  }
  it('a high threshold makes a small forward scrub stay on the current slide', () => {
    const e = engine5();
    // snapGrid [0,800,1600,2400,3200]. Scrub ~20% past slide 1 toward slide 2.
    e.setProgress(800 / 3200 + 0.05); // translate ≈ -960, activeIndex 1
    // threshold 0.8: needs >80% of the gap to advance → stays at 1.
    e.slideToClosest({ speed: 0, threshold: 0.8 });
    expect(e.state.activeIndex).toBe(1);
    expect(e.state.translate).toBe(-800);
  });
  it('a low threshold makes the same scrub advance to the next slide', () => {
    const e = engine5();
    e.setProgress(800 / 3200 + 0.07); // same start, ~27% past slide 1
    // threshold 0.2: >20% of the gap advances → goes to 2.
    e.slideToClosest({ speed: 0, threshold: 0.2 });
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.translate).toBe(-1600);
  });
});
