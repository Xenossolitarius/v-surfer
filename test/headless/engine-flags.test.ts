import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function ready(extra: Record<string, unknown> = {}) {
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0, ...extra });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
  return engine;
}

describe('engine animating flag', () => {
  it('is false at rest, true during a speed>0 transition, cleared on transitionEnd', () => {
    const engine = ready();
    expect(engine.state.animating).toBe(false);
    engine.slideTo(2, { speed: 300 });
    expect(engine.state.animating).toBe(true);
    engine.onTransitionEnd();
    expect(engine.state.animating).toBe(false);
  });

  it('stays false for an instant (speed 0) move', () => {
    const engine = ready();
    engine.slideTo(2, { speed: 0 });
    expect(engine.state.animating).toBe(false);
  });
});

describe('engine allowClick flag', () => {
  it('is true at rest, false after a drag that moves, true again on next pointerStart', () => {
    const engine = ready();
    expect(engine.state.allowClick).toBe(true);
    engine.pointerStart({ x: 50, y: 50, time: 0 });
    engine.pointerMove({ x: 10, y: 50, time: 10 }); // 40px horizontal → moves
    expect(engine.state.allowClick).toBe(false);
    engine.pointerEnd({ x: 10, y: 50, time: 20 });
    engine.pointerStart({ x: 50, y: 50, time: 30 });
    expect(engine.state.allowClick).toBe(true);
  });
});
