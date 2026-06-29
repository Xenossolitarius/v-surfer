import { describe, it, expect } from 'vitest';
import { createLinearSpline, controlledTranslate } from '../../src/headless/controller';

describe('createLinearSpline', () => {
  it('returns 0 for x2 = 0 (frozen short-circuit)', () => {
    const s = createLinearSpline([0, 100, 200], [0, 50, 100]);
    expect(s.interpolate(0)).toBe(0);
  });
  it('interpolates an interior grid point exactly', () => {
    const s = createLinearSpline([0, 100, 200], [0, 50, 100]);
    expect(s.interpolate(100)).toBe(50);
  });
  it('interpolates between grid points (midpoint)', () => {
    const s = createLinearSpline([0, 100, 200], [0, 50, 100]);
    expect(s.interpolate(150)).toBe(75);
  });
  it('interpolates a non-uniform y grid', () => {
    const s = createLinearSpline([0, 100, 200], [0, 30, 100]);
    expect(s.interpolate(50)).toBe(15);
    expect(s.interpolate(150)).toBe(65);
  });
  it('returns NaN at/after the last grid point (frozen edge; caught by container fallback)', () => {
    const s = createLinearSpline([0, 100, 200], [0, 50, 100]);
    expect(Number.isNaN(s.interpolate(200))).toBe(true);
  });
});

describe('controlledTranslate', () => {
  const grid = { snapGrid: [0, 800, 1600], slidesGrid: [0, 800, 1600] };

  it('slide mode with equal grids is identity (interior)', () => {
    const t = controlledTranslate({
      by: 'slide',
      inverse: false,
      loop: false,
      rtl: false,
      master: { translate: -800, ...grid },
      slave: { ...grid },
    });
    expect(t).toBe(-800);
  });

  it('slide mode at the last snap falls back to container (spline NaN) → exact', () => {
    const t = controlledTranslate({
      by: 'slide',
      inverse: false,
      loop: false,
      rtl: false,
      master: { translate: -1600, ...grid },
      slave: { ...grid },
    });
    expect(t).toBe(-1600);
  });

  it('container mode maps proportionally onto a smaller slave', () => {
    // master 0..-1600, slave 0..-400 → multiplier 0.25; master -800 → -200.
    const t = controlledTranslate({
      by: 'container',
      inverse: false,
      loop: false,
      rtl: false,
      master: { translate: -800, snapGrid: [0, 800, 1600], slidesGrid: [0, 800, 1600] },
      slave: { snapGrid: [0, 200, 400], slidesGrid: [0, 200, 400] },
    });
    expect(t).toBe(-200);
  });

  it('container mode forces multiplier to 1 on a degenerate single-snap master', () => {
    // master snapGrid [0] → sMax - sMin = 0 → NaN multiplier → 1.
    const t = controlledTranslate({
      by: 'container',
      inverse: false,
      loop: false,
      rtl: false,
      master: { translate: -100, snapGrid: [0], slidesGrid: [0] },
      slave: { snapGrid: [0, 800], slidesGrid: [0, 800] },
    });
    expect(t).toBe(-100); // (-100 - 0) * 1 + 0
  });

  it('inverse reflects about slave maxTranslate', () => {
    // container, equal grids, master -400 → base -400; inverse: -1600 - (-400) = -1200.
    const t = controlledTranslate({
      by: 'container',
      inverse: true,
      loop: false,
      rtl: false,
      master: { translate: -400, ...grid },
      slave: { ...grid },
    });
    expect(t).toBe(-1200);
  });

  it('rtl flips the read translate sign', () => {
    // rtl: t = -(+800) = -800; container identity → -800.
    const t = controlledTranslate({
      by: 'container',
      inverse: false,
      loop: false,
      rtl: true,
      master: { translate: 800, ...grid },
      slave: { ...grid },
    });
    expect(t).toBe(-800);
  });
});
