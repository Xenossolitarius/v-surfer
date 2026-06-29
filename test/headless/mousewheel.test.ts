import { describe, it, expect } from 'vitest';
import { normalizeWheel, wheelDelta } from '../../src/headless/mousewheel';

const LTR_V = { direction: 'vertical' as const, rtl: false, forceToAxis: false, invert: false };
const LTR_H = { direction: 'horizontal' as const, rtl: false, forceToAxis: false, invert: false };

describe('normalizeWheel', () => {
  it('maps deltaY (pixel mode) straight through to pixelY', () => {
    const n = normalizeWheel({ deltaY: 120, deltaMode: 0 });
    expect(n.pixelY).toBe(120);
    expect(n.pixelX).toBe(0);
    expect(n.spinY).toBe(1); // fallback spin sign
  });
  it('scales line-mode deltas by LINE_HEIGHT (40)', () => {
    const n = normalizeWheel({ deltaY: 3, deltaMode: 1 });
    expect(n.pixelY).toBe(120);
  });
  it('swaps to horizontal when shift is held and no pixelX', () => {
    const n = normalizeWheel({ deltaY: 100, deltaMode: 0, shiftKey: true });
    expect(n.pixelX).toBe(100);
    expect(n.pixelY).toBe(0);
  });
});

describe('wheelDelta', () => {
  it('vertical LTR: negates pixelY (scroll down → negative delta → next)', () => {
    // larger |pixelY| → delta = -pixelY
    expect(wheelDelta({ spinX: 0, spinY: 1, pixelX: 0, pixelY: 120 }, LTR_V)).toBe(-120);
  });
  it('horizontal LTR: negates pixelX*rtlFactor', () => {
    expect(wheelDelta({ spinX: 1, spinY: 0, pixelX: 120, pixelY: 0 }, LTR_H)).toBe(-120);
  });
  it('horizontal RTL: flips the sign', () => {
    expect(
      wheelDelta({ spinX: 1, spinY: 0, pixelX: 120, pixelY: 0 }, { ...LTR_H, rtl: true }),
    ).toBe(120);
  });
  it('forceToAxis vertical: returns null when the horizontal component dominates', () => {
    expect(
      wheelDelta({ spinX: 1, spinY: 0, pixelX: 120, pixelY: 10 }, { ...LTR_V, forceToAxis: true }),
    ).toBeNull();
  });
  it('invert flips the result', () => {
    expect(
      wheelDelta({ spinX: 0, spinY: 1, pixelX: 0, pixelY: 120 }, { ...LTR_V, invert: true }),
    ).toBe(120);
  });
  it('returns null when delta is zero', () => {
    expect(wheelDelta({ spinX: 0, spinY: 0, pixelX: 0, pixelY: 0 }, LTR_V)).toBeNull();
  });
});
