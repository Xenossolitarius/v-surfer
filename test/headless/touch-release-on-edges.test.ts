import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function ready(extra: Record<string, unknown> = {}) {
  // 3 slides of 100 in a 100 container → snapGrid [0,100,200]; at rest translate 0 (beginning).
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0, ...extra });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2].map((n) => ({ data: { n } })));
  return engine;
}

describe('touchReleaseOnEdges', () => {
  it('releases a beyond-edge drag at the beginning (no movement) when on', () => {
    const engine = ready({ touchReleaseOnEdges: true });
    // At the beginning, finger moves RIGHT (prev direction): pushes past minTranslate → released.
    engine.pointerStart({ x: 0, y: 50, time: 0 });
    engine.pointerMove({ x: 60, y: 50, time: 10 });
    expect(engine.state.translate).toBe(0); // released, no translate change
  });

  it('resists the same beyond-edge drag when off (default)', () => {
    const engine = ready({ touchReleaseOnEdges: false });
    engine.pointerStart({ x: 0, y: 50, time: 0 });
    engine.pointerMove({ x: 60, y: 50, time: 10 });
    expect(engine.state.translate).toBeGreaterThan(0); // resisted past the beginning edge
  });

  it('does not release a drag that moves into range', () => {
    const engine = ready({ touchReleaseOnEdges: true });
    // Finger moves LEFT (next direction): pulls toward the end, within range → normal move.
    engine.pointerStart({ x: 60, y: 50, time: 0 });
    engine.pointerMove({ x: 0, y: 50, time: 10 });
    expect(engine.state.translate).toBe(-60);
  });

  it('forces resistanceRatio 0 (pins to the edge) for a mid-range drag that crosses the end', () => {
    // Start at activeIndex 1 (translate -100, mid-range so the edge-release block does NOT fire),
    // then drag further toward the end past maxTranslate (-200). With touchReleaseOnEdges the
    // resistance ratio is 0, pinning the live translate exactly to maxTranslate (-200).
    const engine = ready({ touchReleaseOnEdges: true });
    engine.slideTo(1, { speed: 0 }); // translate -100
    engine.pointerStart({ x: 200, y: 50, time: 0 });
    engine.pointerMove({ x: 50, y: 50, time: 10 }); // diff -150 → currentTranslate -250 < -200
    expect(engine.state.translate).toBe(-200);
  });

  it('rubber-bands past the edge for the same drag when touchReleaseOnEdges is off', () => {
    const engine = ready({ touchReleaseOnEdges: false });
    engine.slideTo(1, { speed: 0 });
    engine.pointerStart({ x: 200, y: 50, time: 0 });
    engine.pointerMove({ x: 50, y: 50, time: 10 });
    expect(engine.state.translate).toBeLessThan(-200); // resisted beyond the edge
  });
});
