import { describe, it, expect } from 'vitest';
import { axisCoord, renderTransform } from '../../src/headless/direction';

describe('axisCoord', () => {
  it('picks x for horizontal, y for vertical', () => {
    expect(axisCoord({ x: 12, y: 34 }, 'horizontal')).toBe(12);
    expect(axisCoord({ x: 12, y: 34 }, 'vertical')).toBe(34);
  });
});

describe('renderTransform', () => {
  it('maps the scalar translate onto the active axis', () => {
    expect(renderTransform(-800, 'horizontal')).toEqual({ x: -800, y: 0 });
    expect(renderTransform(-800, 'vertical')).toEqual({ x: 0, y: -800 });
  });
});
