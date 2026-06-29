import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';

function makeEngine(params: Record<string, unknown>, count = 5, container = 800) {
  const e = createEngine<number>(params);
  e.setGeometry({ containerSize: container });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}

describe('cssMode state fields + centered geometry', () => {
  it('exposes null cssMode fields when cssMode is off', () => {
    const e = makeEngine({ slidesPerView: 1, spaceBetween: 0 });
    expect(e.state.scrollSnapTarget).toBeNull();
    expect(e.state.cssModeCenteredOffset).toBeNull();
  });

  it('non-centered cssMode leaves grids unchanged and offset null', () => {
    const e = makeEngine({ slidesPerView: 1, spaceBetween: 0, cssMode: true });
    expect(e.state.cssModeCenteredOffset).toBeNull();
    // snapGrid for 5×800 = [0,800,1600,2400,3200]
    expect(e.state.snapGrid[0]).toBe(0);
    expect(e.state.snapGrid[e.state.snapGrid.length - 1]).toBe(3200);
  });

  it('centered + cssMode shifts grids to origin and emits centered offset', () => {
    // spv:2 → 400px slides in an 800px container, so centering yields a real offset.
    // Centered snapGrid[0] = -200 (translate that centers slide 0); cssMode shifts +200.
    const e = makeEngine({
      slidesPerView: 2,
      spaceBetween: 0,
      cssMode: true,
      centeredSlides: true,
    });
    expect(e.state.snapGrid[0]).toBe(0);
    expect(e.state.slidesGrid[0]).toBe(0);
    const off = e.state.cssModeCenteredOffset;
    expect(off).not.toBeNull();
    // before = -originalSnapGrid[0] = 200; after = size/2 - lastSlideSize/2 = 400 - 200 = 200.
    expect(off!.before).toBe(200);
    expect(off!.after).toBe(200);
  });
});
