import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { linkControllers } from '../../src/headless/controller';
import { golden } from '../golden/golden';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function makeEngine(count: number) {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0 });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

// Build an engine master→slave pair under the given controller options.
function setup(count: number, by: 'slide' | 'container', inverse: boolean) {
  const masterEngine = makeEngine(count);
  const slaveEngine = makeEngine(count);
  const link = linkControllers([{ from: masterEngine, to: slaveEngine, by, inverse }]);
  cleanups.push(() => link.destroy());
  return { masterEngine, slaveEngine };
}

const g = golden('controller');
afterAll(() => g.save());

describe('differential: controller vs frozen module (non-loop)', () => {
  for (const by of ['slide', 'container'] as const) {
    for (const inverse of [false, true]) {
      it(`slideTo across range matches oracle — by:${by} inverse:${inverse}`, () => {
        const count = 5;
        const { masterEngine, slaveEngine } = setup(count, by, inverse);
        for (const [step, i] of [0, 1, 2, 3, 4, 2, 0].entries()) {
          masterEngine.slideTo(i, { speed: 0 });
          const keyBase = `slideTo-by:${by}-inv:${inverse}-step${step}`;
          expect(slaveEngine.state.translate).toBeCloseTo(
            g.expected(`${keyBase}-translate`) as number,
            6,
          );
          expect(slaveEngine.state.activeIndex).toBe(g.expected(`${keyBase}-activeIndex`));
        }
      });

      it(`arbitrary between-snap translates match oracle — by:${by} inverse:${inverse}`, () => {
        const count = 5;
        const { masterEngine, slaveEngine } = setup(count, by, inverse);
        for (const [step, v] of [-100, -650, -1234, -2000, -3100, -400].entries()) {
          masterEngine.setTranslate(v);
          const keyBase = `setTranslate-by:${by}-inv:${inverse}-step${step}`;
          expect(slaveEngine.state.translate).toBeCloseTo(
            g.expected(`${keyBase}-translate`) as number,
            6,
          );
        }
      });
    }
  }
});
