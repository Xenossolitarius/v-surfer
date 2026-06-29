import { describe, it, expect } from 'vitest';
import { creativeSlideStyle, creativeShadows } from '../../../src/headless/effects/creative';
import type { CreativeParams } from '../../../src/headless/effects/creative';

/**
 * ctx with: translate=0, containerSize=300, 3 slides of size 300
 * cssMode=false, horizontal
 */
const ctx = (over: Record<string, unknown> = {}) => ({
  axis: 'horizontal' as const,
  rtl: false,
  cssMode: false,
  state: {
    translate: 0,
    slidesSizesGrid: [300, 300, 300],
  } as any,
  containerSize: 300,
  crossSize: 200,
  ...over,
});

const defaultParams: CreativeParams = {
  limitProgress: 1,
  shadowPerProgress: false,
  progressMultiplier: 1,
  perspective: true,
  prev: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
  next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
};

/**
 * Scenario: slide to the right of active (progress = -0.5), uses `next` params.
 *
 * Config:
 *   next: { translate: ['-20%', 0, -1], rotate: [0, 0, -90], opacity: 0, scale: 0.8 }
 *   limitProgress=1, progressMultiplier=1
 *
 * Math:
 *   progress = clamp(-0.5, -1, 1) = -0.5  (progress < 0 → next data)
 *   offset = 300, cssMode=false, horizontal
 *   t_base = [-300, 0, 0]
 *   |progress * multiplier| = 0.5
 *   t[0] = "calc(-300px + (-20% * 0.5))"
 *   t[1] = "calc(0px + (0px * 0.5))"
 *   t[2] = "calc(0px + (-1px * 0.5))"
 *   r[2] = -90 * 0.5 = -45
 *   originalProgress = progress = -0.5 (kit simplification; no originalProgress on ComputedSlide)
 *   scale: originalProgress<0 → 1 + (1 - 0.8) * (-0.5) * 1 = 1 - 0.1 = 0.9
 *   opacity: originalProgress<0 → 1 + (1 - 0) * (-0.5) * 1 = 0.5
 *   slideProgress (unclamped) = -0.5, zIndex = -|round(-0.5)| + 3 = -0 + 3 = 3
 */
describe('creativeSlideStyle', () => {
  const nextParams: CreativeParams = {
    ...defaultParams,
    next: {
      translate: ['-20%', 0, -1],
      rotate: [0, 0, -90],
      opacity: 0,
      scale: 0.8,
    },
  };

  it('slide with progress=-0.5 uses next config: calc-based translate, rotate, scale, opacity, zIndex', () => {
    // slide index=1, offset=300, progress=-0.5
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), nextParams);

    // transform: translate3d(t[0], t[1], t[2]) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) scale(0.9)
    expect(result.transform).toBe(
      'translate3d(calc(-300px + (-20% * 0.5)), calc(0px + (0px * 0.5)), calc(0px + (-1px * 0.5))) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) scale(0.9)',
    );
    expect(result.opacity).toBeCloseTo(0.5);
    expect(result.zIndex).toBe(3); // -|round(-0.5)| + 3 = -0 + 3 = 3
  });

  it('active slide (progress=0): identity-like transform, opacity=1, scale=1', () => {
    const slide = { index: 0, offset: 0, progress: 0 } as any;
    const result = creativeSlideStyle(slide, ctx(), nextParams);

    // progress=0 → data is default {translate:[0,0,0],rotate:[0,0,0],scale:1,opacity:1}
    // |progress * multiplier| = 0 → all t[i] = "calc(0px + (0px * 0))"
    // scale=1, opacity=1
    expect(result.transform).toContain('translate3d(');
    expect(result.opacity).toBeCloseTo(1);
    expect(result.zIndex).toBe(3); // -|round(0)| + 3 = 3
  });

  it('slide with progress=+0.5 uses prev config', () => {
    const prevParams: CreativeParams = {
      ...defaultParams,
      prev: {
        translate: ['20%', 0, -1],
        rotate: [0, 0, 90],
        opacity: 0,
        scale: 0.8,
      },
    };
    // offset=-300 (slide to the left), progress=+0.5
    const slide = { index: 0, offset: -300, progress: 0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), prevParams);

    // t_base = [300, 0, 0] (cssMode=false: -offset = 300)
    // |progress * multiplier| = 0.5
    // t[0] = "calc(300px + (20% * 0.5))"
    // r[2] = 90 * 0.5 = 45
    // originalProgress=progress=+0.5 → scale: 1-(1-0.8)*0.5*1=1-0.1=0.9
    // opacity: 1-(1-0)*0.5*1=0.5
    expect(result.transform).toContain('calc(300px + (20% * 0.5))');
    expect(result.transform).toContain('rotateZ(45deg)');
    expect(result.transform).toContain('scale(0.9)');
    expect(result.opacity).toBeCloseTo(0.5);
  });

  it('progress clamped by limitProgress', () => {
    // limitProgress=0.5: progress=-1.5 → clamped to -0.5
    const params: CreativeParams = {
      ...nextParams,
      limitProgress: 0.5,
    };
    const slide = { index: 1, offset: 300, progress: -1.5 } as any;
    const result1 = creativeSlideStyle(slide, ctx(), params);

    // progress=-0.5 after clamping → same as the main scenario above
    expect(result1.transform).toBe(
      'translate3d(calc(-300px + (-20% * 0.5)), calc(0px + (0px * 0.5)), calc(0px + (-1px * 0.5))) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) scale(0.9)',
    );

    // slideProgress (unclamped) = -1.5, zIndex = -|round(-1.5)| + 3
    // Math.round(-1.5) = -1 in JS (rounds toward +∞) → -|-1| + 3 = -1 + 3 = 2
    expect(result1.zIndex).toBe(2);
  });

  it('vertical axis: base translate uses t[1] not t[0]', () => {
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx({ axis: 'vertical' }), nextParams);
    // vertical: t[1]=t[0]=-(-300)=wait: t_base = [-offset, 0, 0] then swap: t[1]=t[0], t[0]=0
    // So t[0]=0, t[1]=-300
    expect(result.transform).toContain('calc(0px +');
    expect(result.transform).toContain('calc(-300px +');
  });

  it('cssMode: base translate includes state.translate', () => {
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const ctxCss = ctx({
      cssMode: true,
      state: { translate: -100, slidesSizesGrid: [300, 300, 300] } as any,
    });
    const result = creativeSlideStyle(slide, ctxCss, nextParams);
    // t[0] = -offset - translate = -300 - (-100) = -200
    expect(result.transform).toContain('calc(-200px +');
  });

  it('numeric translate values emit px suffix', () => {
    const params: CreativeParams = {
      ...defaultParams,
      next: {
        translate: [50, 0, -100],
        rotate: [0, 0, 0],
        opacity: 1,
        scale: 1,
      },
    };
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), params);
    // translate[0]=50 → getTranslateValue(50) = "50px"
    expect(result.transform).toContain('50px * 0.5');
    expect(result.transform).toContain('-100px * 0.5');
  });

  it('transformOrigin set when data.origin provided', () => {
    const params: CreativeParams = {
      ...defaultParams,
      next: {
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        opacity: 1,
        scale: 1,
        origin: 'left center',
      },
    };
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), params);
    expect(result.transformOrigin).toBe('left center');
  });

  it('transformOrigin not set when data.origin not provided', () => {
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), defaultParams);
    expect(result.transformOrigin).toBeUndefined();
  });

  it('progressMultiplier scales the effect', () => {
    const params: CreativeParams = {
      ...nextParams,
      progressMultiplier: 2,
    };
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const result = creativeSlideStyle(slide, ctx(), params);
    // |progress * multiplier| = |-0.5 * 2| = 1
    expect(result.transform).toContain('-20% * 1)');
    expect(result.transform).toContain('-1px * 1)');
  });
});

describe('creativeShadows', () => {
  it('returns empty array when custom=true and data.shadow is falsy', () => {
    // progress=-0.5 → next, next.shadow=undefined → (custom && data.shadow) is false, !custom is false → no shadow
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const params: CreativeParams = {
      ...defaultParams,
      next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
    };
    const shadows = creativeShadows(slide, ctx(), params);
    expect(shadows).toHaveLength(0);
  });

  it('returns a shadow when custom=true and data.shadow=true', () => {
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const params: CreativeParams = {
      ...defaultParams,
      next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1, shadow: true },
    };
    const shadows = creativeShadows(slide, ctx(), params);
    expect(shadows).toHaveLength(1);
    expect(shadows[0]!.className).toBe('v-surfer-slide-shadow v-surfer-slide-shadow-creative');
    // shadowPerProgress=false: shadowOpacity=|progress|=0.5, clamped to [0,1]
    expect(shadows[0]!.opacity).toBeCloseTo(0.5);
  });

  it('returns a shadow when custom=false (progress=0)', () => {
    // progress=0 → data is default, custom=false → !custom = true → shadow injected
    const slide = { index: 0, offset: 0, progress: 0 } as any;
    const params = defaultParams;
    const shadows = creativeShadows(slide, ctx(), params);
    expect(shadows).toHaveLength(1);
    expect(shadows[0]!.className).toBe('v-surfer-slide-shadow v-surfer-slide-shadow-creative');
    // shadowOpacity=|0|=0
    expect(shadows[0]!.opacity).toBeCloseTo(0);
  });

  it('shadowPerProgress=true: shadow opacity = |progress * (1/limitProgress)|', () => {
    const slide = { index: 1, offset: 300, progress: -0.5 } as any;
    const params: CreativeParams = {
      ...defaultParams,
      shadowPerProgress: true,
      limitProgress: 1,
      next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1, shadow: true },
    };
    const shadows = creativeShadows(slide, ctx(), params);
    expect(shadows).toHaveLength(1);
    // shadowOpacity = progress * (1/limitProgress) = -0.5 * 1 = -0.5, abs = 0.5
    expect(shadows[0]!.opacity).toBeCloseTo(0.5);
  });
});
