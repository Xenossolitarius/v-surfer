import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function ready() {
  const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0 });
  engine.setGeometry({ containerSize: 100 });
  engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
  return engine;
}

describe('engine onEvent — state-delta events', () => {
  it('forwards slideChange + activeIndexChange + setTranslate on slideTo', () => {
    const engine = ready();
    const seen: string[] = [];
    engine.onEvent((name) => seen.push(name));
    engine.slideTo(2, { speed: 0 });
    expect(seen).toContain('activeIndexChange');
    expect(seen).toContain('slideChange');
    expect(seen).toContain('setTranslate');
  });

  it('passes the numeric arg for setTranslate', () => {
    const engine = ready();
    const args: Record<string, number | undefined> = {};
    engine.onEvent((name, arg) => {
      args[name] = arg;
    });
    engine.slideTo(1, { speed: 0 });
    expect(typeof args.setTranslate).toBe('number');
  });

  it('unsubscribe stops delivery', () => {
    const engine = ready();
    const seen: string[] = [];
    const off = engine.onEvent((name) => seen.push(name));
    off();
    engine.slideTo(2, { speed: 0 });
    expect(seen).toEqual([]);
  });

  it('does not emit state-delta events on the first commit', () => {
    // Register before any geometry/slides → the initial commits must not spam.
    const engine = createEngine<{ n: number }>({ slidesPerView: 1 });
    const seen: string[] = [];
    engine.onEvent((name) => seen.push(name));
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides([{ data: { n: 0 } }, { data: { n: 1 } }]);
    // Only real deltas from the second commit onward; no activeIndexChange at rest.
    expect(seen).not.toContain('activeIndexChange');
  });
});
