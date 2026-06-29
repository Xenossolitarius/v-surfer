import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

describe('cssMode differential prerequisites', () => {
  it('happy-dom persists scrollLeft and dispatches scroll', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.scrollLeft = 123;
    expect(el.scrollLeft).toBe(123); // if this FAILS, see fallback note below
    let fired = false;
    el.addEventListener('scroll', () => (fired = true));
    el.dispatchEvent(new Event('scroll'));
    expect(fired).toBe(true);
    el.remove();
  });
});

function makeEngine(count: number, params: Record<string, unknown>) {
  const e = createEngine<number>({ cssMode: true, ...params });
  // Vertical surfers measure clientHeight (shim = 400); horizontal use clientWidth (shim = 800).
  const containerSize = params.direction === 'vertical' ? 400 : 800;
  e.setGeometry({ containerSize });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

const g = golden('css-mode');
afterAll(() => g.save());

describe('cssMode differential vs frozen (non-loop)', () => {
  for (const dir of ['horizontal', 'vertical'] as const) {
    for (const centered of [false, true]) {
      it(`slideTo scroll targets match the oracle — ${dir} centered:${centered}`, () => {
        const count = 5;
        const params = {
          slidesPerView: 1,
          spaceBetween: 0,
          direction: dir,
          centeredSlides: centered,
        };
        const engine = makeEngine(count, params);
        for (const [step, i] of [0, 1, 2, 3, 4, 2].entries()) {
          engine.slideTo(i, { speed: 0 });
          const target = engine.state.scrollSnapTarget!;
          const keyBase = `slideTo-scroll-${dir}-centered:${centered}-step${step}`;
          // engine target translate is the snap; frozen scrolls to -translate.
          expect(-target.translate).toBeCloseTo(g.expected(keyBase) as number, 4);
        }
      });

      it(`scroll-fed activeIndex/progress match the oracle — ${dir} centered:${centered}`, () => {
        const count = 5;
        const params = {
          slidesPerView: 1,
          spaceBetween: 0,
          direction: dir,
          centeredSlides: centered,
        };
        const engine = makeEngine(count, params);
        // Drive from the same scroll positions taken from the engine's snapGrid.
        for (const [step, snap] of engine.state.snapGrid.entries()) {
          engine.setTranslate(-snap);
          const keyBase = `scroll-fed-${dir}-centered:${centered}-step${step}`;
          expect(engine.state.activeIndex).toBe(g.expected(`${keyBase}-activeIndex`));
          expect(engine.state.progress).toBeCloseTo(g.expected(`${keyBase}-progress`) as number, 4);
        }
      });
    }
  }
});

describe('cssMode + loop — invariants (not oracle-compared)', () => {
  it('emits finite scroll targets across slideNext steps', () => {
    const e = createEngine<number>(
      { slidesPerView: 1, spaceBetween: 0, cssMode: true, loop: true },
      { scheduler: (fn) => fn() },
    );
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: i })));
    for (let step = 0; step < 6; step += 1) {
      e.slideNext({ speed: 0 });
      expect(e.state.scrollSnapTarget).not.toBeNull();
      expect(Number.isFinite(e.state.scrollSnapTarget!.translate)).toBe(true);
    }
  });
});
