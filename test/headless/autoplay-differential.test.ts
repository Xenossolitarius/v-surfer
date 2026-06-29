import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { autoplayAdvance, type AutoplayDirectionParams } from '../../src/headless/autoplay';
import { golden } from '../golden/golden';

function headlessFirstAdvance(
  n: number,
  initialSlide: number,
  dir: AutoplayDirectionParams,
): number {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0, speed: 0, initialSlide });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: n }, (_, i) => ({ data: i })));
  const st = e.state;
  const cmd = autoplayAdvance(dir, {
    isBeginning: st.isBeginning,
    isEnd: st.isEnd,
    slidesLength: n,
  });
  if (cmd.kind === 'next') e.slideNext({ speed: 0 });
  else if (cmd.kind === 'prev') e.slidePrev({ speed: 0 });
  else if (cmd.kind === 'slideTo') e.slideTo(cmd.index, { speed: 0 });
  return e.state.activeIndex;
}

const D = (over: Partial<AutoplayDirectionParams> = {}): AutoplayDirectionParams => ({
  reverseDirection: false,
  stopOnLastSlide: false,
  loop: false,
  rewind: false,
  ...over,
});

const g = golden('autoplay');
afterAll(() => g.save());

describe('differential: autoplay first-tick advance vs frozen module', () => {
  for (const c of [
    { name: 'forward from start', n: 5, initial: 0, dir: D() },
    { name: 'forward wrap at end', n: 5, initial: 4, dir: D() },
    {
      name: 'forward stopOnLastSlide at end',
      n: 5,
      initial: 4,
      dir: D({ stopOnLastSlide: true }),
    },
    {
      name: 'reverse from middle',
      n: 5,
      initial: 2,
      dir: D({ reverseDirection: true }),
    },
    {
      name: 'reverse wrap at start',
      n: 5,
      initial: 0,
      dir: D({ reverseDirection: true }),
    },
    {
      name: 'reverse stopOnLastSlide at start',
      n: 5,
      initial: 0,
      dir: D({ reverseDirection: true, stopOnLastSlide: true }),
    },
  ]) {
    it(c.name, () => {
      const headless = headlessFirstAdvance(c.n, c.initial, c.dir);
      expect(headless).toBe(g.expected(c.name));
    });
  }
});
