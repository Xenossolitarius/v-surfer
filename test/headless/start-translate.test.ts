import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

describe('engine startTranslate', () => {
  it('defaults to 0 and captures the current translate on pointerStart', () => {
    const engine = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    expect(engine.state.startTranslate).toBe(0);
    engine.slideTo(2, { speed: 0 }); // translate now -200
    expect(engine.state.translate).toBe(-200);
    engine.pointerStart({ x: 0, y: 0, time: 0 });
    expect(engine.state.startTranslate).toBe(-200);
  });
});
