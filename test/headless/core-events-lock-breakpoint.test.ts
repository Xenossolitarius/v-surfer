import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function collect(engine: ReturnType<typeof createEngine>) {
  const names: string[] = [];
  engine.onEvent((n) => names.push(n));
  return names;
}

describe('lock / unlock events', () => {
  it('emits unlock when content grows past one stop and lock when it shrinks back', () => {
    // One slide, 1-up → one snapGrid stop → isLocked true initially.
    const engine = createEngine<{ n: number }>({ slidesPerView: 1 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides([{ data: { n: 0 } }]);
    expect(engine.state.isLocked).toBe(true);

    const names = collect(engine);
    // Grow to 4 slides → multiple stops → unlock.
    engine.setSlides(Array.from({ length: 4 }, (_, i) => ({ data: { n: i } })));
    expect(engine.state.isLocked).toBe(false);
    expect(names).toContain('unlock');
    expect(names).not.toContain('lock');

    names.length = 0;
    // Shrink back to 1 → lock.
    engine.setSlides([{ data: { n: 0 } }]);
    expect(engine.state.isLocked).toBe(true);
    expect(names).toContain('lock');
    expect(names).not.toContain('unlock');
  });
});

describe('breakpoint event', () => {
  it('emits breakpoint when the active min-width breakpoint changes, and not within the same one', () => {
    const engine = createEngine<{ n: number }>({
      slidesPerView: 1,
      breakpoints: { '640': { slidesPerView: 2 }, '1024': { slidesPerView: 3 } },
    });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: { n: i } })));

    const names: string[] = [];
    engine.onEvent((n) => names.push(n));

    // Cross into the 640 breakpoint.
    engine.setBreakpointDimensions({ width: 700, height: 400 });
    expect(engine.state.breakpoint).toBe('640');
    expect(names).toContain('breakpoint');

    names.length = 0;
    // Stay within 640 (still >=640, <1024): no breakpoint event (early-return, no commit).
    engine.setBreakpointDimensions({ width: 800, height: 400 });
    expect(engine.state.breakpoint).toBe('640');
    expect(names).not.toContain('breakpoint');

    names.length = 0;
    // Cross into 1024.
    engine.setBreakpointDimensions({ width: 1100, height: 400 });
    expect(engine.state.breakpoint).toBe('1024');
    expect(names).toContain('breakpoint');
  });
});
