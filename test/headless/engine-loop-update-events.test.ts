import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

describe('engine loopFix + update events', () => {
  it('emits beforeLoopFix + loopFix around a loop nav reorder', () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 1, loop: true, threshold: 0 });
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slidePrev({ speed: 300 }); // at index 0 → a backward wrap reorders the loop
    expect(seen).toContain('beforeLoopFix');
    expect(seen).toContain('loopFix');
  });

  it('emits update on setGeometry', () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 1 });
    engine.setSlides([{ data: { n: 0 } }, { data: { n: 1 } }]);
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.setGeometry({ containerSize: 200 });
    expect(seen).toContain('update');
  });
});
