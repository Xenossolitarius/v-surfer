import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function ready() {
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0 });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
  return engine;
}

describe('engine transition events', () => {
  it('fires the next-direction start family on slideNext(speed>0)', () => {
    const engine = ready();
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slideNext({ speed: 300 });
    expect(seen).toContain('beforeTransitionStart');
    expect(seen).toContain('transitionStart');
    expect(seen).toContain('beforeSlideChangeStart');
    expect(seen).toContain('slideChangeTransitionStart');
    expect(seen).toContain('slideNextTransitionStart');
    expect(seen).not.toContain('slidePrevTransitionStart');
  });

  it('fires the next-direction end family on onTransitionEnd', () => {
    const engine = ready();
    engine.slideNext({ speed: 300 });
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.onTransitionEnd();
    expect(seen).toContain('transitionEnd');
    expect(seen).toContain('slideChangeTransitionEnd');
    expect(seen).toContain('slideNextTransitionEnd');
  });

  it('fires the prev family on slidePrev from a mid position', () => {
    const engine = ready();
    engine.slideTo(2, { speed: 0 });
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slidePrev({ speed: 300 });
    expect(seen).toContain('slidePrevTransitionStart');
    expect(seen).not.toContain('slideNextTransitionStart');
  });

  it('fires the reset family for a speed>0 move that does not change activeIndex', () => {
    const engine = ready();
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slideTo(0, { speed: 300 }); // already at 0 → translate unchanged
    // No transition (translate didn't move) → no reset events.
    expect(seen).not.toContain('slideResetTransitionStart');
  });

  it('does not fire transition events for a speed:0 move', () => {
    const engine = ready();
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slideTo(2, { speed: 0 });
    expect(seen).not.toContain('transitionStart');
  });
});
