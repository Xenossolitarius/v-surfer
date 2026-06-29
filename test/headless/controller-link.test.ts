import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { linkControllers } from '../../src/headless/controller';

function makeEngine(count = 5) {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

function makeLoopEngine(count = 6) {
  const e = createEngine<number>(
    { slidesPerView: 1, spaceBetween: 0, loop: true },
    { scheduler: (fn) => fn() },
  );
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

describe('linkControllers', () => {
  it('drives the slave when the master moves (slide mode, equal grids → identity)', () => {
    const a = makeEngine();
    const b = makeEngine();
    const link = linkControllers([{ from: a, to: b }]);
    a.slideTo(2, { speed: 0 });
    expect(b.state.translate).toBe(a.state.translate);
    expect(b.state.activeIndex).toBe(2);
    link.destroy();
  });

  it('propagates the master transition duration to the slave', () => {
    const a = makeEngine();
    const b = makeEngine();
    const link = linkControllers([{ from: a, to: b }]);
    a.slideTo(1, { speed: 350 });
    expect(b.state.transitionDuration).toBe(350);
    link.destroy();
  });

  it('container mode maps onto a smaller slave proportionally', () => {
    const a = makeEngine(3); // snapGrid [0,800,1600]
    const b = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
    b.setGeometry({ containerSize: 200 }); // snapGrid [0,200,400]
    b.setSlides(Array.from({ length: 3 }, (_, i) => ({ data: i })));
    const link = linkControllers([{ from: a, to: b, by: 'container' }]);
    a.slideTo(1, { speed: 0 }); // a.translate -800 → b -200
    expect(b.state.translate).toBe(-200);
    link.destroy();
  });

  it('one master drives multiple slaves (array of controlled engines)', () => {
    const a = makeEngine();
    const b = makeEngine();
    const c = makeEngine();
    const link = linkControllers([
      { from: a, to: b },
      { from: a, to: c },
    ]);
    a.slideTo(3, { speed: 0 });
    expect(b.state.activeIndex).toBe(3);
    expect(c.state.activeIndex).toBe(3);
    expect(b.state.translate).toBe(a.state.translate);
    expect(c.state.translate).toBe(a.state.translate);
    link.destroy();
  });

  it('mutual A<->B does not run away and settles symmetrically', () => {
    const a = makeEngine();
    const b = makeEngine();
    let aEmits = 0;
    let bEmits = 0;
    a.subscribe(() => (aEmits += 1));
    b.subscribe(() => (bEmits += 1));
    const link = linkControllers([
      { from: a, to: b },
      { from: b, to: a },
    ]);
    a.slideTo(3, { speed: 0 });
    // A moved once, B driven once — the shared guard prevents a feedback storm.
    expect(aEmits).toBe(1);
    expect(bEmits).toBe(1);
    expect(b.state.activeIndex).toBe(3);
    // Driving B now lands A.
    b.slideTo(1, { speed: 0 });
    expect(a.state.activeIndex).toBe(1);
    link.destroy();
  });

  it('destroy unlinks: master moves no longer touch the slave', () => {
    const a = makeEngine();
    const b = makeEngine();
    const link = linkControllers([{ from: a, to: b }]);
    a.slideTo(2, { speed: 0 });
    link.destroy();
    const before = b.state.translate;
    a.slideTo(4, { speed: 0 });
    expect(b.state.translate).toBe(before);
  });

  it('loop one-way: slave stays finite (no NaN/runaway) across a wrap', () => {
    const a = makeLoopEngine();
    const b = makeLoopEngine();
    const link = linkControllers([{ from: a, to: b, by: 'slide', loop: true }]);
    for (let step = 0; step < 8; step += 1) {
      a.slideNext({ speed: 0 });
      expect(Number.isFinite(b.state.translate)).toBe(true);
    }
    link.destroy();
  });

  it('loop + mutual completes without an infinite feedback loop, translates finite', () => {
    const a = makeLoopEngine();
    const b = makeLoopEngine();
    let aEmits = 0;
    a.subscribe(() => (aEmits += 1));
    const link = linkControllers([
      { from: a, to: b, by: 'slide', loop: true },
      { from: b, to: a, by: 'slide', loop: true },
    ]);
    a.slideNext({ speed: 0 });
    // A loop step may commit more than once (reposition + final), but a feedback
    // storm would be unbounded; a small bound proves the guard holds.
    expect(aEmits).toBeLessThan(5);
    expect(Number.isFinite(a.state.translate)).toBe(true);
    expect(Number.isFinite(b.state.translate)).toBe(true);
    link.destroy();
  });
});
