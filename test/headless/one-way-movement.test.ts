import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function ready(extra: Record<string, unknown> = {}) {
  // 3 slides of 100 in a 100 container → snapGrid [0,100,200], maxTranslate -200.
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0, ...extra });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2].map((n) => ({ data: { n } })));
  return engine;
}

describe('oneWayMovement', () => {
  it('forces a backward (prev-direction) drag to move forward', () => {
    const engine = ready({ oneWayMovement: true });
    // Finger moves RIGHT (x 0 → 50): normally a prev-direction drag (resisted at start).
    engine.pointerStart({ x: 0, y: 50, time: 0 });
    engine.pointerMove({ x: 50, y: 50, time: 10 });
    expect(engine.state.translate).toBe(-50); // forward, no resistance
  });

  it('leaves a rightward drag at the resisted edge when off', () => {
    const engine = ready({ oneWayMovement: false });
    engine.pointerStart({ x: 0, y: 50, time: 0 });
    engine.pointerMove({ x: 50, y: 50, time: 10 });
    expect(engine.state.translate).toBeGreaterThan(0); // prev-direction, resisted past min
  });
});
