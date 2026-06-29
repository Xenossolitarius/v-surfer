import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { golden } from '../golden/golden';

const g = golden('core-differential');
afterAll(() => g.save());

function makeEngine(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>(params);
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

function assertParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  const z = (n: number) => (n === 0 ? 0 : n); // normalize -0 → 0 (frozen core yields -0 at the start)
  // toEqual treats -0 !== +0 in Vitest, so normalize grids the same way before comparing.
  const za = (arr: number[]) => arr.map(z);
  const s = engine.state;
  expect(za(s.slidesSizesGrid)).toEqual(za(g.expected(`${keyPrefix}:slidesSizesGrid`) as number[]));
  expect(za(s.slidesGrid)).toEqual(za(g.expected(`${keyPrefix}:slidesGrid`) as number[]));
  expect(za(s.snapGrid)).toEqual(za(g.expected(`${keyPrefix}:snapGrid`) as number[]));
  expect(z(s.translate)).toBe(z(g.expected(`${keyPrefix}:translate`) as number));
  expect(s.activeIndex).toBe(g.expected(`${keyPrefix}:activeIndex`));
  expect(s.isBeginning).toBe(g.expected(`${keyPrefix}:isBeginning`));
  expect(s.isEnd).toBe(g.expected(`${keyPrefix}:isEnd`));
  expect(s.progress).toBeCloseTo(g.expected(`${keyPrefix}:progress`) as number, 6);
}

const CASES = [
  { count: 5, params: { slidesPerView: 1, spaceBetween: 0 } },
  { count: 5, params: { slidesPerView: 2, spaceBetween: 0 } },
  { count: 6, params: { slidesPerView: 1, spaceBetween: 20 } },
  { count: 8, params: { slidesPerView: 3, spaceBetween: 10 } },
];

describe('differential: static layout', () => {
  for (const c of CASES) {
    it(`matches the frozen core — ${JSON.stringify(c.params)} x${c.count}`, () => {
      const engine = makeEngine(c.count, c.params);
      const key = `h:${JSON.stringify(c.params)}x${c.count}:init`;
      assertParity(engine, key);
    });
  }
});

describe('differential: programmatic navigation', () => {
  for (const c of CASES) {
    it(`slideTo/Next/Prev match — ${JSON.stringify(c.params)} x${c.count}`, () => {
      const engine = makeEngine(c.count, c.params);
      const base = `nav:${JSON.stringify(c.params)}x${c.count}`;
      for (const [stepIdx, i] of [2, 4, 0, 3].entries()) {
        engine.slideTo(i, { speed: 0 });
        assertParity(engine, `${base}:slideTo${i}-step${stepIdx}`);
      }
      engine.slideNext({ speed: 0 });
      assertParity(engine, `${base}:slideNext`);
      engine.slidePrev({ speed: 0 });
      assertParity(engine, `${base}:slidePrev`);
    });
  }
});

function makeEngineVertical(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>({ ...params, direction: 'vertical' });
  engine.setGeometry({ containerSize: 400 }); // matches the offsetHeight=400 shim
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

describe('differential: vertical layout + navigation', () => {
  const CASES_V = [
    { count: 5, params: { slidesPerView: 1, spaceBetween: 0 } },
    { count: 6, params: { slidesPerView: 2, spaceBetween: 10 } },
    { count: 8, params: { slidesPerView: 3, spaceBetween: 0 } },
  ];
  for (const c of CASES_V) {
    it(`vertical matches the frozen core — ${JSON.stringify(c.params)} x${c.count}`, () => {
      const engine = makeEngineVertical(c.count, c.params);
      const base = `v:${JSON.stringify(c.params)}x${c.count}`;
      assertParity(engine, `${base}:init`);
      for (const [stepIdx, i] of [2, 4, 0, 3].entries()) {
        engine.slideTo(i, { speed: 0 });
        assertParity(engine, `${base}:slideTo${i}-step${stepIdx}`);
      }
      engine.slideNext({ speed: 0 });
      assertParity(engine, `${base}:slideNext`);
      engine.slidePrev({ speed: 0 });
      assertParity(engine, `${base}:slidePrev`);
    });
  }
});

function makeEngineRtl(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>({ ...params, rtl: true });
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

describe('differential: rtl layout + navigation', () => {
  const CASES_RTL = [
    { count: 8, params: { slidesPerView: 1, spaceBetween: 0 } },
    { count: 6, params: { slidesPerView: 2, spaceBetween: 10 } },
    { count: 8, params: { slidesPerView: 3, spaceBetween: 0 } },
  ];
  for (const c of CASES_RTL) {
    it(`rtl matches the frozen core — ${JSON.stringify(c.params)} x${c.count}`, () => {
      // precondition: rtl:true was passed to createEngine; rtlTranslate is engaged
      const engine = makeEngineRtl(c.count, c.params);
      expect(engine.params.rtl).toBe(true);
      const base = `rtl:${JSON.stringify(c.params)}x${c.count}`;
      assertParity(engine, `${base}:init`);
      for (const [stepIdx, i] of [2, 4, 0, 3].entries()) {
        engine.slideTo(i, { speed: 0 });
        assertParity(engine, `${base}:slideTo${i}-step${stepIdx}`);
      }
      engine.slideNext({ speed: 0 });
      assertParity(engine, `${base}:slideNext`);
      engine.slidePrev({ speed: 0 });
      assertParity(engine, `${base}:slidePrev`);
    });
  }
});

function makeEngineVerticalRtl(count: number, params: Record<string, unknown>) {
  const engine = createEngine<number>({ ...params, direction: 'vertical', rtl: true });
  engine.setGeometry({ containerSize: 400 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

describe('differential: vertical + rtl (rtl is a no-op on the vertical axis)', () => {
  const CASES_VR = [
    { count: 5, params: { slidesPerView: 1, spaceBetween: 0 } },
    { count: 8, params: { slidesPerView: 3, spaceBetween: 0 } },
  ];
  for (const c of CASES_VR) {
    it(`vertical+rtl keeps canonical translate — ${JSON.stringify(c.params)} x${c.count}`, () => {
      // rtl flag is set but rtlTranslate remains false on the vertical axis (cosmetic only)
      const engine = makeEngineVerticalRtl(c.count, c.params);
      expect(engine.params.rtl).toBe(true);
      const base = `vr:${JSON.stringify(c.params)}x${c.count}`;
      assertParity(engine, `${base}:init`);
      for (const [stepIdx, i] of [2, 4, 0, 3].entries()) {
        engine.slideTo(i, { speed: 0 });
        assertParity(engine, `${base}:slideTo${i}-step${stepIdx}`);
      }
    });
  }
});

function makeEngineLoop(count: number, params: Record<string, unknown>) {
  // Synchronous scheduler ⇒ the wrap's deferred final runs inline, so the
  // differential reads the same final state the frozen oracle settles on.
  const engine = createEngine<number>({ ...params, loop: true }, { scheduler: (fn) => fn() });
  engine.setGeometry({ containerSize: 800 });
  engine.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return engine;
}

function assertLoopParity(engine: ReturnType<typeof makeEngineLoop>, keyPrefix: string) {
  const z = (n: number) => (n === 0 ? 0 : n);
  const za = (a: number[]) => a.map(z);
  const s = engine.state;
  expect(za(s.slidesGrid)).toEqual(za(g.expected(`${keyPrefix}:slidesGrid`) as number[]));
  expect(za(s.snapGrid)).toEqual(za(g.expected(`${keyPrefix}:snapGrid`) as number[]));
  expect(z(s.translate)).toBe(z(g.expected(`${keyPrefix}:translate`) as number));
  expect(s.activeIndex).toBe(g.expected(`${keyPrefix}:activeIndex`));
  expect(s.realIndex).toBe(g.expected(`${keyPrefix}:realIndex`));
  expect(s.isBeginning).toBe(g.expected(`${keyPrefix}:isBeginning`));
  expect(s.isEnd).toBe(g.expected(`${keyPrefix}:isEnd`));
}

describe('differential: loop navigation (slideNext / slidePrev)', () => {
  const CASES_LOOP = [
    { count: 8, params: { slidesPerView: 1, slidesPerGroup: 1 } },
    { count: 8, params: { slidesPerView: 3, slidesPerGroup: 1 } },
    { count: 8, params: { slidesPerView: 1, slidesPerGroup: 2 } },
  ];
  for (const c of CASES_LOOP) {
    it(`loop nav matches the frozen core — ${JSON.stringify(c.params)} x${c.count}`, () => {
      // precondition: loop:true is always passed via makeEngineLoop
      const engine = makeEngineLoop(c.count, c.params);
      expect(engine.params.loop).toBe(true);
      const base = `loop:${JSON.stringify(c.params)}x${c.count}`;
      assertLoopParity(engine, `${base}:init`);
      const realSeen = new Set<number>([engine.state.realIndex]);
      let rotated = false;
      for (let i = 0; i < 2 * c.count; i += 1) {
        engine.slideNext({ speed: 0 });
        assertLoopParity(engine, `${base}:slideNext${i}`);
        realSeen.add(engine.state.realIndex);
        if (engine.state.realIndex !== engine.state.activeIndex) rotated = true;
      }
      // non-degeneracy: every reachable real slide was visited.
      // With slidesPerGroup=k, only count/gcd(count,k) unique real positions are reachable
      // per revolution (odd slides are structurally skipped when k>1).
      const spg = (c.params as { slidesPerGroup?: number }).slidesPerGroup ?? 1;
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const expectedUnique = c.count / gcd(c.count, spg);
      expect(realSeen.size).toBe(expectedUnique);
      expect(rotated).toBe(true);
      for (let i = 0; i < c.count; i += 1) {
        engine.slidePrev({ speed: 0 });
        assertLoopParity(engine, `${base}:slidePrev${i}`);
      }
    });
  }
});

function assertClassParity(engine: ReturnType<typeof makeEngine>, keyPrefix: string) {
  const eng = engine.state.slides;
  for (let i = 0; i < eng.length; i += 1) {
    expect(eng[i].isActive).toBe(g.expected(`${keyPrefix}:slide${i}:isActive`));
    expect(eng[i].isNext).toBe(g.expected(`${keyPrefix}:slide${i}:isNext`));
    expect(eng[i].isPrev).toBe(g.expected(`${keyPrefix}:slide${i}:isPrev`));
  }
}

const flushRaf = () => new Promise((r) => setTimeout(r, 0));

describe('differential: loop slideToLoop', () => {
  const CASES_TL = [
    { count: 8, params: { slidesPerView: 1, slidesPerGroup: 1 } },
    { count: 8, params: { slidesPerView: 3, slidesPerGroup: 1 } },
    { count: 8, params: { slidesPerView: 1, slidesPerGroup: 2 } },
  ];
  for (const c of CASES_TL) {
    it(`slideToLoop matches the frozen core — ${JSON.stringify(c.params)} x${c.count}`, async () => {
      const engine = makeEngineLoop(c.count, c.params);
      const base = `stl:${JSON.stringify(c.params)}x${c.count}`;
      for (const [stepIdx, k] of [3, 6, 1, 7, 0, 4].entries()) {
        engine.slideToLoop(k, { speed: 0 });
        await flushRaf();
        // realIndex === k when slidesPerGroup=1; with slidesPerGroup>1 the snap grid
        // may land on an adjacent group boundary (same behaviour as the frozen oracle).
        expect(engine.state.realIndex).toBe(g.expected(`${base}:step${stepIdx}-k${k}:realIndex`));
        assertLoopParity(engine, `${base}:step${stepIdx}-k${k}`);
      }
    });
  }
});

describe('differential: per-slide active/next/prev classes', () => {
  for (const c of CASES) {
    it(`active/next/prev classes match the frozen core — ${JSON.stringify(c.params)} x${c.count}`, () => {
      const engine = makeEngine(c.count, c.params);
      const base = `cls:${JSON.stringify(c.params)}x${c.count}`;
      assertClassParity(engine, `${base}:init`); // at rest after init
      for (const [stepIdx, i] of [1, 3, 0, c.count - 1].entries()) {
        engine.slideTo(i, { speed: 0 });
        assertClassParity(engine, `${base}:slideTo${i}-step${stepIdx}`);
      }
    });
  }
});
