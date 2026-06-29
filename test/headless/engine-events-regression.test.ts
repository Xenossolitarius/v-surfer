import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

describe('events regression (final-review fixes)', () => {
  it('loop wrap does not double-emit activeIndexChange or flap edges', () => {
    // Use a sync scheduler so the deferred final runs inline, matching prod timing.
    let deferred: (() => void) | null = null;
    const engine = createEngine<{ n: number }>(
      { slidesPerView: 1, loop: true, threshold: 0 },
      {
        scheduler: (fn) => {
          deferred = fn;
        },
      },
    );
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slidePrev({ speed: 300 }); // backward wrap from index 0
    deferred!(); // run the deferred final move
    expect(seen.filter((n) => n === 'activeIndexChange').length).toBe(1); // not 2
    expect(seen).not.toContain('fromEdge'); // no spurious reposition leave-edge
  });

  it('re-entrant listener does not corrupt the diff baseline', () => {
    const engine = createEngine<{ n: number }>({ slidesPerView: 1, threshold: 0 });
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
    let reentered = false;
    engine.onEvent((n) => {
      if (n === 'activeIndexChange' && !reentered) {
        reentered = true;
        engine.slideTo(3, { speed: 0 }); // re-enter during emit
      }
    });
    engine.slideTo(2, { speed: 0 });
    // Now at index 3. A no-op slideTo(3) must emit NO activeIndexChange.
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slideTo(3, { speed: 0 });
    expect(seen).not.toContain('activeIndexChange');
  });

  it('cssMode does not emit the transition family', () => {
    const engine = createEngine<{ n: number }>({
      slidesPerView: 1,
      loop: true,
      cssMode: true,
      threshold: 0,
    });
    engine.setGeometry({ containerSize: 100 });
    engine.setSlides([0, 1, 2, 3, 4].map((n) => ({ data: { n } })));
    const seen: string[] = [];
    engine.onEvent((n) => seen.push(n));
    engine.slideTo(2, { speed: 300 });
    expect(seen).not.toContain('transitionStart');
    expect(seen).not.toContain('slideChangeTransitionStart');
  });
});
