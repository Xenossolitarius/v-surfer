import { describe, it, expect } from 'vitest';
import { coverflowSlideStyle, coverflowShadows } from '../../../src/headless/effects/coverflow';

/**
 * ctx with: translate=0, containerSize=300, slideSize=300 for all slides (via slidesSizesGrid)
 * Centered slide: offset=0 → centerOffset=(150-0-150)/300=0 → offsetMultiplier=0
 * Off-center slide: offset=300 → centerOffset=(150-300-150)/300=-1 → offsetMultiplier=-1
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

const params = {
  rotate: 50,
  stretch: 0,
  depth: 100,
  scale: 1,
  modifier: 1,
  slideShadows: true,
};

describe('coverflowSlideStyle', () => {
  it('centered slide (offsetMultiplier=0): identity-like transform, zIndex=1', () => {
    // translate=0, containerSize=300 → center=150
    // offset=0, slideSize=300 → centerOffset=(150-0-150)/300=0 → offsetMultiplier=0
    // rotateY=50*0=0, translateZ=-100*0=0, scale=1-(1-1)*0=1
    // translateX=stretch*offsetMultiplier=0*0=0
    // transform: translate3d(0px,0px,0px)  rotateX(0deg) rotateY(0deg) scale(1)
    // zIndex=-|round(0)|+1=1
    const s = coverflowSlideStyle({ index: 0, offset: 0 } as any, ctx(), params);
    expect(s.transform).toBe('translate3d(0px,0px,0px)  rotateX(0deg) rotateY(0deg) scale(1)');
    expect(s.zIndex).toBe(1);
  });

  it('off-center slide to the right (offsetMultiplier=-1): rotateY=-50, translateZ=-100, zIndex=0', () => {
    // translate=0, containerSize=300 → center=150
    // offset=300, slideSize=300 → centerOffset=(150-300-150)/300=-1 → offsetMultiplier=-1
    // rotateY=50*(-1)=-50, translateZ=-100*1=-100, scale=1-0*1=1
    // translateX=0*(-1)=0
    // transform: translate3d(0px,0px,-100px)  rotateX(0deg) rotateY(-50deg) scale(1)
    // zIndex=-|round(-1)|+1=-1+1=0
    const s = coverflowSlideStyle({ index: 1, offset: 300 } as any, ctx(), params);
    expect(s.transform).toBe('translate3d(0px,0px,-100px)  rotateX(0deg) rotateY(-50deg) scale(1)');
    expect(s.zIndex).toBe(0);
  });

  it('off-center to the left (offsetMultiplier=+1): rotateY=+50, translateZ=-100, zIndex=0', () => {
    // offset=-300 → centerOffset=(150-(-300)-150)/300=300/300=1 → offsetMultiplier=1
    // rotateY=50*1=50, translateZ=-100*1=-100
    // zIndex=-|round(1)|+1=-1+1=0
    const s = coverflowSlideStyle({ index: 0, offset: -300 } as any, ctx(), params);
    expect(s.transform).toBe('translate3d(0px,0px,-100px)  rotateX(0deg) rotateY(50deg) scale(1)');
    expect(s.zIndex).toBe(0);
  });

  it('vertical axis: uses rotateX instead of rotateY', () => {
    // axis=vertical, rotate param=50, frozen sets rotate = -params.rotate = -50 for vertical
    // offsetMultiplier=1 → rotateX = rotate*offsetMultiplier = -50*1 = -50, rotateY=0
    // translateY=stretch*offsetMultiplier=0, translateX=0
    const s = coverflowSlideStyle(
      { index: 0, offset: -300 } as any,
      ctx({ axis: 'vertical' }),
      params,
    );
    expect(s.transform).toContain('rotateX(-50deg)');
    expect(s.transform).toContain('rotateY(0deg)');
  });

  it('stretch as number: adds translateX offset', () => {
    // offsetMultiplier=-1, stretch=30 → translateX=30*(-1)=-30
    const s = coverflowSlideStyle({ index: 1, offset: 300 } as any, ctx(), {
      ...params,
      stretch: 30,
    });
    expect(s.transform).toContain('translate3d(-30px,0px,-100px)');
  });

  it('stretch as percent string: stretch is fraction of slideSize', () => {
    // slideSize=300, stretch='10%' → stretch=30, offsetMultiplier=-1 → translateX=30*(-1)=-30
    const s = coverflowSlideStyle({ index: 1, offset: 300 } as any, ctx(), {
      ...params,
      stretch: '10%',
    });
    expect(s.transform).toContain('translate3d(-30px,0px,-100px)');
  });

  it('scale param: scale < 1 reduces off-center slides', () => {
    // scale=0.9, offsetMultiplier=-1 → scale=1-(1-0.9)*1=0.9
    const s = coverflowSlideStyle({ index: 1, offset: 300 } as any, ctx(), {
      ...params,
      scale: 0.9,
    });
    expect(s.transform).toContain('scale(0.9)');
  });

  it('modifier as function: uses function output for offsetMultiplier', () => {
    // modifier=(o)=>o*2, centerOffset=-1 → offsetMultiplier=-2
    // rotateY=50*(-2)=-100, translateZ=-100*2=-200, scale=1-(1-1)*2=1
    const s = coverflowSlideStyle({ index: 1, offset: 300 } as any, ctx(), {
      ...params,
      modifier: (o: number) => o * 2,
    });
    expect(s.transform).toContain('rotateY(-100deg)');
    expect(s.transform).toContain('-200px');
    expect(s.zIndex).toBe(-1); // -|round(-2)|+1 = -2+1 = -1
  });

  it('sub-0.001 values are zeroed', () => {
    // translateZ=-100*|0.0001|=-0.01 → zeroed to 0; rotateY=50*0.0001→zeroed
    // centerOffset=(150 - 149.97 - 150)/300 = -149.97/300... let's pick offset≈149.97
    // Let's use: offset such that centerOffset≈0 but small — use offset=0 with tiny translate
    // translate=-0.001*300=0.3 → center=150.15
    // centerOffset=(150.15-0-150)/300=0.15/300=0.0005
    // offsetMultiplier=0.0005*1=0.0005
    // rotateY=50*0.0005=0.025>0.001 so not zeroed...
    // Better: translateZ=-100*|0.000005|=-0.0005 → zeroed
    // Use offsetMultiplier=0.000005: centerOffset=0.000005
    // translate such that center = offset+slideSize/2 + 0.000005*slideSize
    // = 0 + 150 + 0.0015 = 150.0015 → -translate + 150 = 150.0015 → translate=-0.0015
    const s = coverflowSlideStyle(
      { index: 0, offset: 0 } as any,
      ctx({ state: { translate: -0.0015, slidesSizesGrid: [300, 300, 300] } }),
      params,
    );
    // rotateY=50*0.000005=0.00025 → zeroed to 0
    // translateZ=-100*0.000005=-0.0005 → zeroed to 0
    expect(s.transform).toContain('rotateY(0deg)');
    expect(s.transform).toContain(',0px,0px)');
  });
});

describe('coverflowShadows', () => {
  it('horizontal: left shadow opacity=max(offsetMultiplier,0), right=max(-offsetMultiplier,0)', () => {
    // offsetMultiplier=-1: left=max(-1,0)=0, right=max(1,0)=1
    const shadows = coverflowShadows({ index: 1, offset: 300 } as any, ctx(), params);
    expect(shadows).toHaveLength(2);
    const left = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const right = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(left!.className).toContain('v-surfer-slide-shadow-coverflow');
    expect(right!.className).toContain('v-surfer-slide-shadow-coverflow');
    expect(left!.opacity).toBeCloseTo(0);
    expect(right!.opacity).toBeCloseTo(1);
  });

  it('offsetMultiplier=+1 (left of center): left shadow=1, right=0', () => {
    // offset=-300 → offsetMultiplier=1: left=max(1,0)=1, right=max(-1,0)=0
    const shadows = coverflowShadows({ index: 0, offset: -300 } as any, ctx(), params);
    const left = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const right = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(left!.opacity).toBeCloseTo(1);
    expect(right!.opacity).toBeCloseTo(0);
  });

  it('vertical: uses top/bottom shadow directions', () => {
    const shadows = coverflowShadows(
      { index: 1, offset: 300 } as any,
      ctx({ axis: 'vertical' }),
      params,
    );
    const top = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-top'));
    const bottom = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-bottom'));
    expect(top).toBeDefined();
    expect(bottom).toBeDefined();
    expect(top!.className).toContain('v-surfer-slide-shadow-coverflow');
    expect(bottom!.className).toContain('v-surfer-slide-shadow-coverflow');
  });

  it('centered slide (offsetMultiplier=0): both shadows opacity=0', () => {
    const shadows = coverflowShadows({ index: 0, offset: 0 } as any, ctx(), params);
    const left = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-left'));
    const right = shadows.find((s) => s.className.includes('v-surfer-slide-shadow-right'));
    expect(left!.opacity).toBeCloseTo(0);
    expect(right!.opacity).toBeCloseTo(0);
  });
});
