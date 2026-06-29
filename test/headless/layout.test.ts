import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

describe('EngineState.layout', () => {
  it('defaults: horizontal, all flags false', () => {
    const e = createEngine({});
    expect(e.state.layout).toEqual({
      direction: 'horizontal',
      rtl: false,
      cssMode: false,
      centeredSlides: false,
      freeMode: false,
      virtual: false,
      loop: false,
      rewind: false,
      autoHeight: false,
      slidesPerView: 1,
    });
  });

  it('reflects resolved params', () => {
    const e = createEngine({
      direction: 'vertical',
      rtl: true,
      cssMode: true,
      centeredSlides: true,
      freeMode: true,
      virtual: true,
      loop: true,
      rewind: true,
      autoHeight: true,
      slidesPerView: 3,
    });
    expect(e.state.layout).toEqual({
      direction: 'vertical',
      rtl: true,
      cssMode: true,
      centeredSlides: true,
      freeMode: true,
      virtual: true,
      loop: true,
      rewind: true,
      autoHeight: true,
      slidesPerView: 3,
    });
  });

  it('updates after setParams', () => {
    const e = createEngine({ direction: 'horizontal' });
    e.setParams({ direction: 'vertical', rtl: true });
    expect(e.state.layout.direction).toBe('vertical');
    expect(e.state.layout.rtl).toBe(true);
  });
});
