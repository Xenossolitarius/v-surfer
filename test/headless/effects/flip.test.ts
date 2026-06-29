import { describe, it, expect } from 'vitest';
import { flipSlideStyle, flipShadows } from '../../../src/headless/effects/flip';

const ctx = (over: Record<string, unknown> = {}) => ({
  axis: 'horizontal' as const,
  rtl: false,
  cssMode: false,
  state: { translate: -100, slides: [{}, {}, {}] } as any,
  containerSize: 200,
  crossSize: 200,
  ...over,
});

const params = { slideShadows: true, limitRotation: true };

describe('flipSlideStyle', () => {
  it('horizontal non-cssMode limitRotation: rotateY=90deg, translate3d(-50,0,0), zIndex=-1+length', () => {
    // progress=-0.5, offset=50
    // rotate = -180 * (-0.5) = 90
    // rotateY = 90 (horizontal, no rtl)
    // tx = -offset = -50 (non-cssMode)
    // ty = 0
    const s = flipSlideStyle({ offset: 50, progress: -0.5 } as any, ctx(), params);
    expect(s.transform).toContain('rotateY(90deg)');
    expect(s.transform).toContain('translate3d(-50px, 0px, 0px)');
    // Math.round(-0.5) in JS = 0, so zIndex = -|0| + 3 = 3
    expect(s.zIndex).toBe(3);
  });

  it('cssMode: tx = -offset - translate', () => {
    // tx = -offset - translate = -50 - (-100) = 50
    const s = flipSlideStyle({ offset: 50, progress: -0.5 } as any, ctx({ cssMode: true }), params);
    expect(s.transform).toContain('translate3d(50px, 0px, 0px)');
  });

  it('vertical: rotateX used instead of rotateY', () => {
    // rotate = -180 * (-0.5) = 90
    // rotateX = -rotateY = -90, rotateY = 0
    // ty = tx = -offset = -50, tx = 0
    const s = flipSlideStyle(
      { offset: 50, progress: -0.5 } as any,
      ctx({ axis: 'vertical' }),
      params,
    );
    expect(s.transform).toContain('rotateX(-90deg)');
    expect(s.transform).toContain('rotateY(0deg)');
    expect(s.transform).toContain('translate3d(0px, -50px, 0px)');
  });

  it('rtl horizontal: rotateY negated', () => {
    // rotate = -180 * (-0.5) = 90; rtl => rotateY = -90
    const s = flipSlideStyle({ offset: 50, progress: -0.5 } as any, ctx({ rtl: true }), params);
    expect(s.transform).toContain('rotateY(-90deg)');
  });

  it('limitRotation=false: progress not clamped (>1 possible)', () => {
    // progress=2 → rotate = -180*2 = -360, rotateY=-360
    const s = flipSlideStyle({ offset: 0, progress: 2 } as any, ctx(), {
      slideShadows: false,
      limitRotation: false,
    });
    expect(s.transform).toContain('rotateY(-360deg)');
  });

  it('limitRotation=true: progress clamped to [-1,1]', () => {
    // progress=2 clamped to 1 → rotate=-180, rotateY=-180
    const s = flipSlideStyle({ offset: 0, progress: 2 } as any, ctx(), params);
    expect(s.transform).toContain('rotateY(-180deg)');
  });

  it('active slide (progress=0): rotateY=0, zIndex=slides.length', () => {
    const s = flipSlideStyle({ offset: 0, progress: 0 } as any, ctx(), params);
    expect(s.transform).toContain('rotateY(0deg)');
    expect(s.zIndex).toBe(3); // -|round(0)| + 3 = 3
  });
});

describe('flipShadows', () => {
  it('horizontal: before=v-surfer-slide-shadow-left-flip opacity=max(-progress,0), after=right-flip opacity=max(progress,0)', () => {
    // progress=-0.5 => before opacity=0.5, after opacity=0
    const shadows = flipShadows({ offset: 50, progress: -0.5 } as any, ctx(), params);
    expect(shadows).toHaveLength(2);
    const before = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const after = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(before!.className).toContain('v-surfer-slide-shadow-flip');
    expect(after!.className).toContain('v-surfer-slide-shadow-flip');
    expect(before!.opacity).toBeCloseTo(0.5);
    expect(after!.opacity).toBeCloseTo(0);
  });

  it('positive progress: before=0, after=max(progress,0)', () => {
    // progress=0.5 => before opacity=0, after opacity=0.5
    const shadows = flipShadows({ offset: 50, progress: 0.5 } as any, ctx(), params);
    const before = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const after = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(before!.opacity).toBeCloseTo(0);
    expect(after!.opacity).toBeCloseTo(0.5);
  });

  it('vertical: uses top/bottom shadow directions', () => {
    const shadows = flipShadows(
      { offset: 50, progress: -0.5 } as any,
      ctx({ axis: 'vertical' }),
      params,
    );
    const before = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-top'));
    const after = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-bottom'));
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(before!.opacity).toBeCloseTo(0.5);
    expect(after!.opacity).toBeCloseTo(0);
  });

  it('limitRotation clamps progress for shadow opacity', () => {
    // progress=2 clamped to 1 => before=max(-1,0)=0, after=max(1,0)=1
    const shadows = flipShadows({ offset: 0, progress: 2 } as any, ctx(), params);
    const before = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const after = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(before!.opacity).toBeCloseTo(0);
    expect(after!.opacity).toBeCloseTo(1);
  });
});
