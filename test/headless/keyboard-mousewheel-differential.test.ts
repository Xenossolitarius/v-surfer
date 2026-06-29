import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { keyboardAction } from '../../src/headless/keyboard';
import { normalizeWheel, wheelDelta, WheelController } from '../../src/headless/mousewheel';
import { golden } from '../golden/golden';

function makeEngine(count: number, params: Record<string, unknown>) {
  const e = createEngine<number>(params);
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

const g = golden('keyboard-mousewheel');
afterAll(() => g.save());

afterEach(() => {
  vi.useRealTimers();
});

describe('differential: keyboard vs frozen module', () => {
  for (const c of [
    { dir: 'horizontal' as const, rtl: false, keys: [39, 39, 37] },
    { dir: 'horizontal' as const, rtl: true, keys: [39, 37] },
    { dir: 'vertical' as const, rtl: false, keys: [40, 40, 38] },
  ]) {
    it(`key→slide matches — ${c.dir}${c.rtl ? ' rtl' : ''}`, () => {
      const engine = makeEngine(6, { direction: c.dir, rtl: c.rtl });
      for (const [step, code] of c.keys.entries()) {
        // drive headless via the pure decision
        const r = keyboardAction(
          code,
          { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false },
          { direction: c.dir, rtl: c.rtl, pageUpDown: true },
        );
        const engBefore = engine.state.activeIndex;
        if (r.action === 'next') engine.slideNext({ speed: 0 });
        else if (r.action === 'prev') engine.slidePrev({ speed: 0 });
        const engDelta = engine.state.activeIndex - engBefore;
        const key = `keyboard-${c.dir}${c.rtl ? '-rtl' : ''}-step${step}-sign`;
        expect(Math.sign(engDelta)).toBe(g.expected(key));
      }
    });
  }
});

describe('differential: mousewheel discrete vs frozen module', () => {
  it('a sequence of spaced wheels advances both identically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const engine = makeEngine(6, {});
    const controller = new WheelController({
      freeMode: false,
      sticky: false,
      releaseOnEdges: false,
      thresholdDelta: null,
      thresholdTime: null,
      sensitivity: 1,
    });
    // space events 300ms apart so neither the 60ms debounce nor the 150ms gate suppresses them
    for (let i = 0; i < 3; i += 1) {
      const time = 1000 + i * 300;
      vi.setSystemTime(time);
      const delta = wheelDelta(normalizeWheel({ deltaY: 120 }), {
        direction: 'horizontal',
        rtl: false,
        forceToAxis: false,
        invert: false,
      })!;
      const st = engine.state;
      const out = controller.step(delta, time, {
        isBeginning: st.isBeginning,
        isEnd: st.isEnd,
        loop: false,
      });
      if (out.effect.kind === 'slide') {
        if (out.effect.dir === 'next') engine.slideNext({ speed: 0 });
        else engine.slidePrev({ speed: 0 });
      }
      expect(engine.state.activeIndex).toBe(g.expected(`mousewheel-discrete-step${i}-activeIndex`));
    }
  });
});

describe('differential: mousewheel free-mode scrub vs frozen module', () => {
  it('a single wheel scrubs both translates to the same value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const engine = makeEngine(6, { freeMode: true });
    // headless: scrub by delta*sensitivity then setProgress (mirrors the component)
    const delta = wheelDelta(normalizeWheel({ deltaY: 100 }), {
      direction: 'horizontal',
      rtl: false,
      forceToAxis: false,
      invert: false,
    })!;
    const st = engine.state;
    const min = st.snapGrid[0] === 0 ? 0 : -st.snapGrid[0];
    const max = -st.snapGrid[st.snapGrid.length - 1];
    let pos = st.translate + delta * 1;
    if (pos > min) pos = min;
    if (pos < max) pos = max;
    engine.setProgress(max - min === 0 ? 0 : (pos - min) / (max - min));
    expect(engine.state.translate).toBeCloseTo(
      g.expected('mousewheel-freemode-translate') as number,
      3,
    );
  });
});
