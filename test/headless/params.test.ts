import { describe, it, expect } from 'vitest';
import { normalizeParams } from '../../src/headless/params';

describe('normalizeParams', () => {
  it('fills every Phase-1 default when given nothing', () => {
    expect(normalizeParams({})).toEqual({
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 300,
      initialSlide: 0,
      slidesPerGroup: 1,
      slidesPerGroupSkip: 0,
      slidesPerGroupAuto: false,
      centeredSlides: false,
      centerInsufficientSlides: false,
      centeredSlidesBounds: false,
      loopPreventsSliding: true,
      roundLengths: false,
      autoHeight: false,
      cssMode: false,
      normalizeSlideIndex: true,
      allowTouchMove: true,
      allowSlideNext: true,
      allowSlidePrev: true,
      simulateTouch: true,
      touchRatio: 1,
      touchAngle: 45,
      touchReleaseOnEdges: false,
      threshold: 5,
      resistance: true,
      resistanceRatio: 0.85,
      followFinger: true,
      shortSwipes: true,
      longSwipes: true,
      longSwipesMs: 300,
      longSwipesRatio: 0.5,
      oneWayMovement: false,
      virtual: false,
      addSlidesBefore: 0,
      addSlidesAfter: 0,
      virtualAutoSlidesPerView: 0,
      loop: false,
      rewind: false,
      loopAdditionalSlides: 0,
      freeMode: false,
      freeModeMomentum: true,
      freeModeMomentumRatio: 1,
      freeModeMomentumVelocityRatio: 1,
      freeModeMomentumBounce: true,
      freeModeMomentumBounceRatio: 1,
      freeModeSticky: false,
      freeModeMinimumVelocity: 0.02,
      direction: 'horizontal',
      rtl: false,
    });
  });

  it('overrides only the provided keys', () => {
    const p = normalizeParams({ slidesPerView: 3, spaceBetween: 16 });
    expect(p.slidesPerView).toBe(3);
    expect(p.spaceBetween).toBe(16);
    expect(p.speed).toBe(300); // untouched default
  });
});
