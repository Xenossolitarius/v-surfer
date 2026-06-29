import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function setup(count = 5, params = { slidesPerView: 1 }) {
  const engine = createEngine<{ n: number }>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: { n: i } })));
  return engine;
}

describe('engine.recompute()', () => {
  it('is callable and re-emits a snapshot with stable geometry for unchanged inputs', () => {
    const engine = setup();
    const before = engine.state.snapGrid.slice();
    let emitted = 0;
    const off = engine.subscribe(() => (emitted += 1));
    engine.recompute();
    off();
    // recompute commits a fresh snapshot (subscriber fired)...
    expect(emitted).toBe(1);
    // ...and geometry is stable for unchanged container/slides/params.
    expect(engine.state.snapGrid).toEqual(before);
  });

  it('recomputes geometry after a direct param mutation via setParams round-trips identically', () => {
    const engine = setup();
    engine.setParams({ slidesPerView: 2 });
    const grid = engine.state.snapGrid.slice();
    engine.recompute();
    expect(engine.state.snapGrid).toEqual(grid);
  });
});
