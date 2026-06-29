import { describe, it, expect } from 'vitest';
import {
  cubeSlideTransform,
  cubeWrapperTransform,
  cubeShadowTransform,
  cubeSlideShadowOpacity,
} from '../../../src/headless/effects/cube';

const ctx = (over: Record<string, unknown> = {}) => ({
  axis: 'horizontal' as const,
  rtl: false,
  cssMode: false,
  state: { translate: 0, slides: [{}, {}, {}, {}] } as any,
  containerSize: 800,
  crossSize: 600,
  ...over,
});

const params = { slideShadows: true, shadow: true, shadowOffset: 20, shadowScale: 0.94 };

// ─── Per-slide face transform (realIndex % 4 branches) at progress=0 ────────
describe('cubeSlideTransform – face transforms at progress=0', () => {
  it('realIndex=0 (branch 0): rotateY(0deg) translate3d(-0px, 0px, 0px)', () => {
    // slideIndex=0, round=0, branch 0: tx=-0*4*800=0, tz=0
    // slideAngle=0; rotateY(0), translate3d(0,0,0); wrapperRotate=0+0*90=0
    const result = cubeSlideTransform(0, 0, ctx());
    expect(result.transform).toBe('rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)');
    expect(result.wrapperRotate).toBe(0);
  });

  it('realIndex=1 (branch 1): rotateY(90deg) translate3d(0px, 0px, -0px)', () => {
    // slideIndex=1, round=0, branch 1: tx=0, tz=-0*4*800=0
    // slideAngle=90; rotateY(90deg), translate3d(0,0,0)
    // progress=0, in (-1,1] => wrapperRotate=1*90+0*90=90
    const result = cubeSlideTransform(1, 0, ctx());
    expect(result.transform).toBe('rotateX(0deg) rotateY(90deg) translate3d(0px, 0px, 0px)');
    expect(result.wrapperRotate).toBe(90);
  });

  it('realIndex=2 (branch 2): rotateY(180deg) translate3d(800+0px, 0px, 800px)', () => {
    // slideIndex=2, round=0, branch 2: tx=800+0*4*800=800, tz=800
    // slideAngle=180; rotateY(180deg), translate3d(800,0,800)
    const result = cubeSlideTransform(2, 0, ctx());
    expect(result.transform).toBe('rotateX(0deg) rotateY(180deg) translate3d(800px, 0px, 800px)');
  });

  it('realIndex=3 (branch 3): rotateY(270deg) translate3d(-800px, 0px, 3*800+0px)', () => {
    // slideIndex=3, round=0, branch 3: tx=-800, tz=3*800+800*4*0=2400
    // slideAngle=270; rotateY(270deg), translate3d(-800,0,2400)
    const result = cubeSlideTransform(3, 0, ctx());
    expect(result.transform).toBe('rotateX(0deg) rotateY(270deg) translate3d(-800px, 0px, 2400px)');
  });
});

// ─── Wrapper rotation mid-progress ───────────────────────────────────────────
describe('cubeSlideTransform – wrapperRotate accumulation', () => {
  it('active slide (realIndex=0) at progress=-0.5: wrapperRotate=0+(-0.5)*90=-45', () => {
    // progress=-0.5, in (-1,1] => wrapperRotate=0*90+(-0.5)*90=-45
    const result = cubeSlideTransform(0, -0.5, ctx());
    expect(result.wrapperRotate).toBeCloseTo(-45);
  });

  it('slide (realIndex=1) at progress=0.5: wrapperRotate=1*90+0.5*90=135', () => {
    const result = cubeSlideTransform(1, 0.5, ctx());
    expect(result.wrapperRotate).toBeCloseTo(135);
  });

  it('slide at progress=1 (boundary included): wrapperRotate still computed', () => {
    // progress=1 is in (-1,1] so wrapperRotate is set
    const result = cubeSlideTransform(0, 1, ctx());
    expect(result.wrapperRotate).toBeCloseTo(90);
  });

  it('slide at progress > 1: wrapperRotate=0 (not computed)', () => {
    // progress > 1, not in (-1,1]
    const result = cubeSlideTransform(2, 1.5, ctx());
    expect(result.wrapperRotate).toBe(0);
  });
});

// ─── Vertical axis ────────────────────────────────────────────────────────────
describe('cubeSlideTransform – vertical', () => {
  it('realIndex=0 vertical: rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)', () => {
    const result = cubeSlideTransform(0, 0, ctx({ axis: 'vertical' }));
    expect(result.transform).toBe('rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)');
  });

  it('realIndex=1 vertical: rotateX(-90deg), ty instead of tx', () => {
    // vertical: ty=tx=0, tx=0; slideAngle=90; rotateX(-90deg), rotateY(0deg)
    const result = cubeSlideTransform(1, 0, ctx({ axis: 'vertical' }));
    expect(result.transform).toBe('rotateX(-90deg) rotateY(0deg) translate3d(0px, 0px, 0px)');
  });
});

// ─── RTL ─────────────────────────────────────────────────────────────────────
describe('cubeSlideTransform – rtl', () => {
  it('realIndex=1 rtl horizontal: slideAngle=-90, wrapperRotate=-90', () => {
    // rtl: slideAngle = -1*90 = -90; round = floor(90/360)=0
    // branch 1: tx=0, tz=0; rotateY(-90deg)
    const result = cubeSlideTransform(1, 0, ctx({ rtl: true }));
    expect(result.transform).toContain('rotateY(-90deg)');
    expect(result.wrapperRotate).toBeCloseTo(-90);
  });
});

// ─── cubeWrapperTransform ────────────────────────────────────────────────────
describe('cubeWrapperTransform', () => {
  it('horizontal: translate3d(0px,0,0px) rotateX(0deg) rotateY(45deg) when wrapperRotate=-45', () => {
    // frozen: rotateY(${r(-wrapperRotate)}deg) → -(-45) = 45
    const { transform, transformOrigin } = cubeWrapperTransform(-45, ctx());
    expect(transform).toBe('translate3d(0px,0,0px) rotateX(0deg) rotateY(45deg)');
    expect(transformOrigin).toBe('50% 50% -400px'); // containerSize/2 = 400
  });

  it('horizontal: rotateY(-90deg) for wrapperRotate=90 (typical slide[1] active)', () => {
    // frozen: rotateY(${r(-wrapperRotate)}deg) → -(90) = -90
    const { transform } = cubeWrapperTransform(90, ctx());
    expect(transform).toBe('translate3d(0px,0,0px) rotateX(0deg) rotateY(-90deg)');
  });

  it('vertical: translate3d(0px,0,0px) rotateX(45deg) rotateY(0deg)', () => {
    const { transform } = cubeWrapperTransform(45, ctx({ axis: 'vertical' }));
    expect(transform).toBe('translate3d(0px,0,0px) rotateX(45deg) rotateY(0deg)');
  });
});

// ─── cubeShadowTransform ─────────────────────────────────────────────────────
describe('cubeShadowTransform', () => {
  it('horizontal: translate3d with containerSize/2 + shadowOffset', () => {
    // horizontal: surferWidth = containerSize=800 (in horizontal ctx, containerSize IS width)
    // Frozen shadow horizontal: translate3d(0px, surferWidth/2 + offset, -surferWidth/2)
    // That's: 800/2 + 20 = 420, -800/2 = -400
    const transform = cubeShadowTransform(-45, ctx(), params);
    expect(transform).toContain('translate3d(0px, 420px, -400px)');
    expect(transform).toContain(`scale(${params.shadowScale})`);
  });

  it('vertical: shadow transform with computed multiplier and scaled z-offset', () => {
    // vertical: surferHeight = containerSize, wrapperRotate=45, shadowOffset=20, shadowScale=0.94
    // In vertical mode: containerSize=800 (main axis, height), crossSize=600 (cross axis, width)
    // shadowAngle = |45| - floor(|45|/90)*90 = 45 - 0 = 45
    // sin(45°) = sin(π/4) ≈ 0.70710678, cos(45°) ≈ 0.70710678
    // multiplier = 1.5 - (0.70710678/2 + 0.70710678/2) = 1.5 - 0.70710678 ≈ 0.79289322
    // scale1 = 0.94
    // scale2 = 0.94 / 0.79289322 ≈ 1.18553164
    // translate: ty = 800/2 + 20 = 420, tz = -(800/2) / 1.18553164 ≈ -337.40137
    const shadowAngle = Math.abs(45) - Math.floor(Math.abs(45) / 90) * 90;
    const multiplier =
      1.5 -
      (Math.sin((shadowAngle * 2 * Math.PI) / 360) / 2 +
        Math.cos((shadowAngle * 2 * Math.PI) / 360) / 2);
    const scale2 = 0.94 / multiplier;
    const expectedZ = -(800 / 2) / scale2;
    const expectedTransform = `scale3d(0.94, 1, ${scale2}) translate3d(0px, 420px, ${expectedZ}px) rotateX(-89.99deg)`;
    const transform = cubeShadowTransform(45, ctx({ axis: 'vertical' }), params);
    expect(transform).toBe(expectedTransform);
  });
});

// ─── cubeSlideShadowOpacity ──────────────────────────────────────────────────
describe('cubeSlideShadowOpacity', () => {
  it('negative progress: beforeOpacity = max(-progress,0), afterOpacity = 0', () => {
    const { beforeOpacity, afterOpacity } = cubeSlideShadowOpacity(-0.6);
    expect(beforeOpacity).toBeCloseTo(0.6);
    expect(afterOpacity).toBeCloseTo(0);
  });

  it('positive progress: beforeOpacity = 0, afterOpacity = progress', () => {
    const { beforeOpacity, afterOpacity } = cubeSlideShadowOpacity(0.7);
    expect(beforeOpacity).toBeCloseTo(0);
    expect(afterOpacity).toBeCloseTo(0.7);
  });

  it('progress clamped to [-1,1]', () => {
    const { beforeOpacity } = cubeSlideShadowOpacity(-2);
    expect(beforeOpacity).toBeCloseTo(1);
    const { afterOpacity } = cubeSlideShadowOpacity(2);
    expect(afterOpacity).toBeCloseTo(1);
  });
});
