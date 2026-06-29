import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function makeEngine(count: number) {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

describe('engine.setTranslate', () => {
  it('sets an absolute translate, duration, and recomputes activeIndex', () => {
    const e = makeEngine(5); // snapGrid [0,800,1600,2400,3200]
    e.setTranslate(-1600, { speed: 300 });
    expect(e.state.translate).toBe(-1600);
    expect(e.state.transitionDuration).toBe(300);
    expect(e.state.activeIndex).toBe(2);
  });

  it('defaults speed to 0 and emits exactly once to subscribers', () => {
    const e = makeEngine(5);
    let emitted = 0;
    e.subscribe(() => (emitted += 1));
    e.setTranslate(-800);
    expect(e.state.translate).toBe(-800);
    expect(e.state.transitionDuration).toBe(0);
    expect(e.state.activeIndex).toBe(1);
    expect(emitted).toBe(1);
  });

  it('sets translate verbatim WITHOUT clamping (slave can overshoot maxTranslate)', () => {
    const e = makeEngine(3); // maxTranslate = -1600
    e.setTranslate(-2000);
    expect(e.state.translate).toBe(-2000);
  });
});
