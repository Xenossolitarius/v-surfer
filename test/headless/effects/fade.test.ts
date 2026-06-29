import { describe, it, expect } from 'vitest';
import { fadeSlideStyle } from '../../../src/headless/effects/fade';

const ctx = (over = {}) => ({
  axis: 'horizontal' as const,
  rtl: false,
  cssMode: false,
  state: { translate: -100 } as any,
  containerSize: 200,
  crossSize: 200,
  ...over,
});

describe('fadeSlideStyle', () => {
  it('default fade: opacity from clamped progress, transform counters offset', () => {
    const s = fadeSlideStyle({ offset: 100, progress: -0.5 } as any, ctx(), { crossFade: false });
    // tx = -offset = -100 (virtualTranslate path; translate NOT subtracted)
    expect(s.transform).toBe('translate3d(-100px, 0px, 0px)');
    // default opacity = 1 + min(max(progress,-1),0) = 1 + (-0.5) = 0.5
    expect(Number(s.opacity)).toBeCloseTo(0.5);
  });
  it('crossFade: opacity = max(1 - |progress|, 0)', () => {
    const s = fadeSlideStyle({ offset: 0, progress: -0.5 } as any, ctx(), { crossFade: true });
    expect(Number(s.opacity)).toBeCloseTo(0.5);
  });
  it('vertical maps tx onto ty', () => {
    const s = fadeSlideStyle({ offset: 100, progress: 0 } as any, ctx({ axis: 'vertical' }), {
      crossFade: false,
    });
    expect(s.transform).toBe('translate3d(0px, -100px, 0px)');
  });
});
