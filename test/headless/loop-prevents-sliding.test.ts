import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function loopEngine(extra: Record<string, unknown> = {}) {
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, loop: true, ...extra });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
  return engine;
}

describe('loopPreventsSliding', () => {
  it('no-ops slideNext while a loop transition is animating, resumes after transitionEnd', () => {
    const engine = loopEngine({ loopPreventsSliding: true });
    engine.slideTo(2, { speed: 300 }); // animating = true
    const frozen = engine.state.activeIndex;
    engine.slideNext();
    expect(engine.state.activeIndex).toBe(frozen); // blocked
    engine.onTransitionEnd(); // animating = false
    engine.slideNext();
    expect(engine.state.activeIndex).not.toBe(frozen); // moves now
  });

  it('does not block when loopPreventsSliding is false', () => {
    const engine = loopEngine({ loopPreventsSliding: false });
    engine.slideTo(2, { speed: 300 });
    const frozen = engine.state.activeIndex;
    engine.slideNext();
    expect(engine.state.activeIndex).not.toBe(frozen);
  });

  it('a no-op speed>0 slideTo does not latch animating (loop nav stays alive)', () => {
    const engine = loopEngine({ loopPreventsSliding: true });
    const start = engine.state.activeIndex;
    engine.slideTo(start, { speed: 300 }); // resolves to the current translate → no-op
    expect(engine.state.animating).toBe(false);
    engine.slideNext();
    expect(engine.state.activeIndex).not.toBe(start); // not bricked by a stuck `animating`
  });
});
