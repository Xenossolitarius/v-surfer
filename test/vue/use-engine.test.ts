import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import { createEngine } from '../../src/headless/engine';
import { useEngine } from '../../src/vue/use-engine';

describe('useEngine', () => {
  it('does not throw when used outside an effect scope', () => {
    const engine = createEngine<number>({ slidesPerView: 1 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides([{ data: 0 }, { data: 1 }]);
    expect(() => useEngine(engine)).not.toThrow();
  });

  it('mirrors engine state into a ref and updates on change', () => {
    const engine = createEngine<number>({ slidesPerView: 1 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));

    const scope = effectScope();
    const state = scope.run(() => useEngine(engine))!;
    expect(state.value.activeIndex).toBe(0);
    engine.slideTo(2, { speed: 0 });
    expect(state.value.activeIndex).toBe(2);
    expect(state.value.translate).toBe(-1600);
    expect(state.value).toBe(engine.state);
    scope.stop();
    // after dispose, further engine changes are not required to update the ref
    engine.slideTo(0, { speed: 0 });
    expect(state.value.activeIndex).toBe(2);
  });
});
