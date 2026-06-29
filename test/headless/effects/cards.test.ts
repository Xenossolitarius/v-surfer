import { describe, it, expect } from 'vitest';
import { cardsSlideStyle, cardsShadows } from '../../../src/headless/effects/cards';

const defaultParams = {
  slideShadows: true,
  rotate: true,
  perSlideRotate: 2,
  perSlideOffset: 8,
};

/** Build a minimal EffectCtx */
const ctx = (over: Record<string, unknown> = {}) => ({
  axis: 'horizontal' as const,
  rtl: false,
  cssMode: false,
  state: {
    translate: 0,
    startTranslate: 0,
    touching: false,
    activeIndex: 0,
    slides: [{}, {}, {}, {}],
  } as any,
  containerSize: 800,
  crossSize: 600,
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// STATIC CASE (touching:false) — no nudge branch executed
// ─────────────────────────────────────────────────────────────────────────────

describe('cardsSlideStyle – static (touching:false)', () => {
  it('active slide (progress=0, offset=0): transform has 0px tZ, 0deg rotate, scale(1)', () => {
    const s = cardsSlideStyle({ index: 0, progress: 0, offset: 0 } as any, ctx(), defaultParams);
    // tZ = -100*|0| = 0; rotate = -2*0 = 0; scaleString = 1; tX = "0px"
    expect(s.transform).toContain('translate3d(0px,');
    expect(s.transform).toContain('0px)'); // tZ=0
    expect(s.transform).toContain('rotateZ(0deg)');
    expect(s.transform).toContain('scale(1)');
    // zIndex = -|round(0)| + 4 = 4
    expect(s.zIndex).toBe(4);
  });

  it('prev slide (progress=1, offset=800): tZ=-100, rotateZ(-2deg), tX includes -7.25%', () => {
    // progress=1: tZ=-100, rotate=-2*1=-2; tXAdd=8-1*0.75=7.25
    // progress>0: tX = calc(-800px + (-7.25%))
    // scaleString = 1-(1-1)*1 = 1
    // zIndex = -|round(1)| + 4 = 3
    const s = cardsSlideStyle({ index: 1, progress: 1, offset: 800 } as any, ctx(), defaultParams);
    expect(s.transform).toContain('-100px)'); // tZ=-100
    expect(s.transform).toContain('rotateZ(-2deg)');
    expect(s.transform).toContain('calc(-800px + (-7.25%))');
    expect(s.transform).toContain('scale(1)');
    expect(s.zIndex).toBe(3);
  });

  it('next slide (progress=-1, offset=-800): tZ=-100, rotateZ(2deg), tX includes +7.25%', () => {
    // progress=-1: tZ=-100, rotate=-2*(-1)=2; tXAdd=8-1*0.75=7.25
    // progress<0: tX = calc(--800px + (7.25%)) = calc(800px + (7.25%))
    // Actually tX_raw = -offset = -(-800) = 800 for offset=-800
    // tX = `calc(${tX}px ${rtl?'-':'+'} (${tXAdd*|progress|}%))`
    //     = `calc(800px + (7.25%))`
    // scaleString = 1+(1-1)*(-1) = 1
    // zIndex = -|round(-1)| + 4 = 3
    const s = cardsSlideStyle(
      { index: 3, progress: -1, offset: -800 } as any,
      ctx(),
      defaultParams,
    );
    expect(s.transform).toContain('-100px)'); // tZ=-100
    expect(s.transform).toContain('rotateZ(2deg)');
    expect(s.transform).toContain('calc(800px + (7.25%))');
    expect(s.transform).toContain('scale(1)');
    expect(s.zIndex).toBe(3);
  });

  it('progress=-2: tZ=-200, rotateZ(4deg), tXAdd=8-1.5=6.5, tX=calc(1600px + (13%))', () => {
    // progress=-2: tZ=-200, rotate=-2*(-2)=4; tXAdd=8-2*0.75=6.5
    // offset=-1600: tX_raw=-(-1600)=1600
    // progress<0: tX=calc(1600px + (6.5*2%)) = calc(1600px + (13%))
    // scaleString=1+(1-1)*(-2)=1
    // zIndex=-|round(-2)|+4=-2+4=2
    const s = cardsSlideStyle(
      { index: 2, progress: -2, offset: -1600 } as any,
      ctx(),
      defaultParams,
    );
    expect(s.transform).toContain('-200px)'); // tZ=-200
    expect(s.transform).toContain('rotateZ(4deg)');
    expect(s.transform).toContain('calc(1600px + (13%))');
    expect(s.zIndex).toBe(2);
  });

  it('rotate:false: rotateZ is always 0deg', () => {
    const s = cardsSlideStyle({ index: 1, progress: 1, offset: 800 } as any, ctx(), {
      ...defaultParams,
      rotate: false,
    });
    expect(s.transform).toContain('rotateZ(0deg)');
  });

  it('progress clamped: progress=-5 → clamped to -4, tZ=-400', () => {
    const s = cardsSlideStyle(
      { index: 3, progress: -5, offset: -4000 } as any,
      ctx(),
      defaultParams,
    );
    expect(s.transform).toContain('-400px)'); // tZ=-100*4=-400
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SWIPE NUDGE — isSwipeToNext: slide.index===activeIndex, progress in (0,1),
//               currentTranslate < startTranslate
// ─────────────────────────────────────────────────────────────────────────────

describe('cardsSlideStyle – swipe nudge (touching:true, isSwipeToNext)', () => {
  // Setup: activeIndex=0, slide.index=0 (active), progress=0.5
  // touching=true, translate=-50 (currentTranslate=-50), startTranslate=0
  // currentTranslate < startTranslate → -50 < 0 → true → isSwipeToNext
  // subProgress = (1 - |(|0.5| - 0.5) / 0.5|)^0.5 = (1-0)^0.5 = 1
  // rotate = -2*0.5 + (-28*0.5*1) = -1 + -14 = -15
  // scale = 1 + (-0.5*1) = 0.5
  // tXAdd = 8 - 0.5*0.75 + 96*1 = 7.625 + 96 = 103.625
  // tY = `${(rotate||isHorizontal?-25:0)*subProgress*|progress|}%`
  //     = `${-25*1*0.5}%` = `-12.5%`
  // scaleString: progress > 0 → 1-(1-0.5)*0.5 = 1-0.25 = 0.75

  const nudgeCtx = ctx({
    state: {
      translate: -50,
      startTranslate: 0,
      touching: true,
      activeIndex: 0,
      slides: [{}, {}, {}, {}],
    },
  });

  it('nudge: rotate is altered (includes -15 from base + swipe nudge)', () => {
    const s = cardsSlideStyle(
      { index: 0, progress: 0.5, offset: 0 } as any,
      nudgeCtx,
      defaultParams,
    );
    // rotate = -2*0.5 + (-28*0.5*1) = -15
    // rotateZ with rtl=false → rotateZ(-15deg)
    expect(s.transform).toContain('rotateZ(-15deg)');
  });

  it('nudge: scale is altered (scaleString=0.75)', () => {
    const s = cardsSlideStyle(
      { index: 0, progress: 0.5, offset: 0 } as any,
      nudgeCtx,
      defaultParams,
    );
    expect(s.transform).toContain('scale(0.75)');
  });

  it('nudge: tY is non-zero (-12.5%)', () => {
    const s = cardsSlideStyle(
      { index: 0, progress: 0.5, offset: 0 } as any,
      nudgeCtx,
      defaultParams,
    );
    // tY = `-12.5%`; tX includes tXAdd=103.625
    expect(s.transform).toContain('-12.5%');
  });

  it('no nudge when touching=false (same progress): rotate stays at -1deg', () => {
    // Without touching, no nudge: rotate=-2*0.5=-1
    const staticCtx = ctx({
      state: {
        translate: -50,
        startTranslate: 0,
        touching: false,
        activeIndex: 0,
        slides: [{}, {}, {}, {}],
      },
    });
    const s = cardsSlideStyle(
      { index: 0, progress: 0.5, offset: 0 } as any,
      staticCtx,
      defaultParams,
    );
    expect(s.transform).toContain('rotateZ(-1deg)');
    expect(s.transform).not.toContain('rotateZ(-15deg)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────────────────────

describe('cardsShadows', () => {
  it('returns single shadow with class v-surfer-slide-shadow and suffix cards', () => {
    const shadows = cardsShadows({ index: 0, progress: 1 } as any, ctx(), defaultParams);
    expect(shadows).toHaveLength(1);
    expect(shadows[0].className).toContain('v-surfer-slide-shadow');
    expect(shadows[0].className).toContain('cards');
  });

  it('opacity = clamp((|progress|-0.5)/0.5, 0, 1): progress=1 → opacity=1', () => {
    // (|1|-0.5)/0.5 = 0.5/0.5 = 1 → clamp(1,0,1) = 1
    const shadows = cardsShadows({ index: 0, progress: 1 } as any, ctx(), defaultParams);
    expect(shadows[0].opacity).toBeCloseTo(1);
  });

  it('opacity: progress=0.5 → 0 (exactly at boundary)', () => {
    // (|0.5|-0.5)/0.5 = 0/0.5 = 0 → clamp(0,0,1) = 0
    const shadows = cardsShadows({ index: 0, progress: 0.5 } as any, ctx(), defaultParams);
    expect(shadows[0].opacity).toBeCloseTo(0);
  });

  it('opacity: progress=0.75 → 0.5', () => {
    // (|0.75|-0.5)/0.5 = 0.25/0.5 = 0.5
    const shadows = cardsShadows({ index: 0, progress: 0.75 } as any, ctx(), defaultParams);
    expect(shadows[0].opacity).toBeCloseTo(0.5);
  });

  it('opacity: progress=0 → clamp(-1,0,1) = 0', () => {
    // (|0|-0.5)/0.5 = -1 → clamped to 0
    const shadows = cardsShadows({ index: 0, progress: 0 } as any, ctx(), defaultParams);
    expect(shadows[0].opacity).toBeCloseTo(0);
  });

  it('opacity: negative progress (progress=-1) → opacity=1', () => {
    // (|-1|-0.5)/0.5 = 0.5/0.5 = 1
    const shadows = cardsShadows({ index: 1, progress: -1 } as any, ctx(), defaultParams);
    expect(shadows[0].opacity).toBeCloseTo(1);
  });
});
