import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { navigationModel } from '../../src/headless/navigation';
import { paginationModel, type PaginationType } from '../../src/headless/pagination';
import { golden } from '../golden/golden';

function makeEngine(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

const g = golden('navigation-pagination');
afterAll(() => g.save());

describe('differential: navigation vs frozen module', () => {
  for (const c of [
    { count: 5, params: { slidesPerView: 1, spaceBetween: 0 } },
    { count: 6, params: { slidesPerView: 2, spaceBetween: 0, slidesPerGroup: 2 } },
  ]) {
    const paramStr = JSON.stringify(c.params);
    it(`disabled flags match — ${paramStr}`, () => {
      const engine = makeEngine(c.count, c.params);
      const navParams = { loop: false, rewind: false };
      for (const i of [0, 2, 4, 1]) {
        engine.slideTo(i, { speed: 0 });
        const m = navigationModel(engine.state, navParams);
        const keyBase = `nav-disabled-${c.count}-${JSON.stringify(c.params)}-slide${i}`;
        expect(m.prevDisabled).toBe(g.expected(`${keyBase}-prevDisabled`));
        expect(m.nextDisabled).toBe(g.expected(`${keyBase}-nextDisabled`));
      }
    });
  }

  it('lock class matches — single-slide surfer (snapGrid.length === 1)', () => {
    // A single-slide surfer has exactly one snap point, so isLocked is true.
    // The frozen Navigation module applies `v-surfer-button-lock` to prevEl/nextEl
    // (navigation.ts:60-62) when watchOverflow && enabled && isLocked.
    // The headless navigationModel.locked mirrors this: snapGrid.length <= 1.
    const engine = makeEngine(1, { slidesPerView: 1, spaceBetween: 0 });
    const navParams = { loop: false, rewind: false };
    const m = navigationModel(engine.state, navParams);
    // Headless model must report locked for a single-snap surfer
    expect(m.locked).toBe(true);
    // Headless locked must agree with the fixture (captured from frozen button lock-class)
    expect(m.locked).toBe(g.expected('nav-lock-locked'));
    expect(m.locked).toBe(g.expected('nav-lock-prevLock'));
    expect(m.locked).toBe(g.expected('nav-lock-nextLock'));
    expect(m.locked).toBe(g.expected('nav-lock-nextLocked'));
  });
});

describe('differential: pagination vs frozen module', () => {
  const CASES: Array<{
    count: number;
    type: PaginationType;
    params: { slidesPerView: number; spaceBetween: number; slidesPerGroup: number };
  }> = [
    {
      count: 5,
      type: 'bullets',
      params: { slidesPerView: 1, spaceBetween: 0, slidesPerGroup: 1 },
    },
    {
      count: 6,
      type: 'bullets',
      params: { slidesPerView: 2, spaceBetween: 0, slidesPerGroup: 2 },
    },
    {
      count: 5,
      type: 'fraction',
      params: { slidesPerView: 1, spaceBetween: 0, slidesPerGroup: 1 },
    },
    {
      count: 5,
      type: 'progressbar',
      params: { slidesPerView: 1, spaceBetween: 0, slidesPerGroup: 1 },
    },
  ];
  for (const c of CASES) {
    it(`${c.type} matches — ${JSON.stringify(c.params)} x${c.count}`, () => {
      const engine = makeEngine(c.count, c.params);
      const pagParams = {
        type: c.type,
        loop: false,
        slidesPerGroup: c.params.slidesPerGroup,
        slidesLength: c.count,
      };
      for (const i of [0, 2, 4, 1]) {
        engine.slideTo(i, { speed: 0 });
        const m = paginationModel(engine.state, pagParams);
        const keyBase = `pag-${c.type}-${c.count}-${JSON.stringify(c.params)}-slide${i}`;
        if (c.type === 'bullets') {
          expect(m.total).toBe(g.expected(`${keyBase}-total`));
          expect(m.current).toBe(g.expected(`${keyBase}-current`));
        } else if (c.type === 'fraction') {
          expect(String(m.fraction.current)).toBe(g.expected(`${keyBase}-fracCur`));
          expect(String(m.fraction.total)).toBe(g.expected(`${keyBase}-fracTot`));
        } else {
          expect(m.progress).toBeCloseTo(g.expected(`${keyBase}-progress`) as number, 5);
        }
      }
    });
  }
});

describe('differential: pagination under loop', () => {
  // NOTE: oracle.slideToLoop is a no-op in happy-dom (loop DOM rotation requires real CSS
  // layout to measure slide sizes; without it loopFix bails without repositioning). The
  // oracle's activeIndex / realIndex / translate never change from their initial values when
  // slideToLoop is called, so bullet active stays frozen at 0 regardless of the target index.
  // We use slideTo for both sides to land both models in the same coordinate position so the
  // paginationModel output can be compared against the oracle's rendered bullets. The loop
  // differential is still meaningful: both models are initialised with loop:true and the
  // pagination derivation uses realIndex; what we verify is that the resulting current/total
  // is identical.
  it('bullets total + active match the frozen module (loop, spg 1)', () => {
    const params = { slidesPerView: 1, spaceBetween: 0, slidesPerGroup: 1, loop: true };
    const engine = createEngine<number>({ ...params }, { scheduler: (fn) => fn() });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 6 }, (_, i) => ({ data: i })));
    const pagParams = { type: 'bullets' as const, loop: true, slidesPerGroup: 1, slidesLength: 6 };
    for (const r of [0, 2, 4, 1]) {
      // Use slideTo (not slideToLoop) — oracle.slideToLoop is a happy-dom no-op; see note above.
      engine.slideTo(r, { speed: 0 });
      const m = paginationModel(engine.state, pagParams);
      const keyBase = `pag-loop-bullets-6-slide${r}`;
      expect(m.total).toBe(g.expected(`${keyBase}-total`));
      expect(m.current).toBe(g.expected(`${keyBase}-current`));
    }
  });
});
