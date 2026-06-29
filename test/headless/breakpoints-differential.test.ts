import { describe, it, expect, afterAll } from 'vitest';
import { resolveBreakpoint } from '../../src/headless/breakpoints';
import { golden } from '../golden/golden';

const g = golden('breakpoints');
afterAll(() => g.save());

describe('differential: breakpoint key selection vs frozen getBreakpoint', () => {
  const NUMERIC = {
    640: { slidesPerView: 2 },
    1024: { slidesPerView: 3 },
    1440: { slidesPerView: 4 },
  };
  const RATIO = { '@0.5': { slidesPerView: 2 }, '@1.0': { slidesPerView: 3 } };

  it('matches across a width sweep (numeric keys)', () => {
    for (const width of [0, 320, 639, 640, 641, 1000, 1023, 1024, 1439, 1440, 1441, 3000]) {
      const height = 800;
      const key = `numeric-${width}-${height}`;
      expect(resolveBreakpoint(NUMERIC, { width, height })).toBe(g.expected(key));
    }
  });

  it('matches across a width sweep (ratio keys, height-based)', () => {
    for (const width of [0, 300, 400, 500, 799, 800, 801, 1200]) {
      const height = 800; // @0.5 = 400, @1.0 = 800
      const key = `ratio-${width}-${height}`;
      expect(resolveBreakpoint(RATIO, { width, height })).toBe(g.expected(key));
    }
  });

  it('matches a mixed numeric + ratio map', () => {
    const mixed = { 640: { slidesPerView: 2 }, '@1.0': { slidesPerView: 5 } };
    for (const width of [500, 640, 700, 900, 1000, 1100]) {
      const height = 900; // @1.0 = 900
      const key = `mixed-${width}-${height}`;
      expect(resolveBreakpoint(mixed, { width, height })).toBe(g.expected(key));
    }
  });
});
