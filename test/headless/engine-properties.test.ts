import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function setup(count = 5, params = { slidesPerView: 1 }) {
  const engine = createEngine<{ n: number }>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: { n: i } })));
  return engine;
}

describe('engine previousIndex', () => {
  it('holds the activeIndex from before the most recent change', () => {
    const engine = setup();
    expect(engine.state.previousIndex).toBe(0);
    engine.slideTo(2);
    expect(engine.state.activeIndex).toBe(2);
    expect(engine.state.previousIndex).toBe(0);
    engine.slideTo(4);
    expect(engine.state.activeIndex).toBe(4);
    expect(engine.state.previousIndex).toBe(2);
  });
});

describe('engine snapIndex / isLocked', () => {
  it('snapIndex tracks the nearest snapGrid stop and isLocked reflects content fit', () => {
    const engine = setup();
    expect(engine.state.snapIndex).toBe(0);
    expect(engine.state.isLocked).toBe(false); // 5 slides, 1-up → multiple stops
    engine.slideTo(3);
    expect(engine.state.snapIndex).toBe(3);
  });

  it('isLocked is true when a single slide fills the container', () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 1 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides([{ data: { n: 0 } }]);
    expect(engine.state.isLocked).toBe(true); // one stop → locked
  });
});

describe('engine swipeDirection / touches', () => {
  it('a simulated drag sets swipeDirection and touches coordinates', () => {
    const engine = setup(5, { slidesPerView: 1, threshold: 0 });
    // Drag left (next): pointer moves from x=400 to x=300.
    engine.pointerStart({ x: 400, y: 50, time: 0 });
    engine.pointerMove({ x: 300, y: 50, time: 16 });
    expect(engine.state.touches.startX).toBe(400);
    expect(engine.state.touches.currentX).toBe(300);
    expect(engine.state.swipeDirection).toBe('next');
  });
});

describe('engine.params', () => {
  it('exposes the resolved params', () => {
    const engine = setup(5, { slidesPerView: 2, spaceBetween: 10 });
    expect(engine.params.slidesPerView).toBe(2);
    expect(engine.params.spaceBetween).toBe(10);
  });
});
