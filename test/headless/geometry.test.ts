import { describe, it, expect } from 'vitest';
import { computeGeometry } from '../../src/headless/slides-geometry';
import { normalizeParams } from '../../src/headless/params';

describe('computeGeometry', () => {
  it('slidesPerView:1, 5 slides, 800px container', () => {
    const g = computeGeometry(5, 800, normalizeParams({ slidesPerView: 1 }));
    expect(g.slidesSizesGrid).toEqual([800, 800, 800, 800, 800]);
    expect(g.slidesGrid).toEqual([0, 800, 1600, 2400, 3200]);
    expect(g.snapGrid).toEqual([0, 800, 1600, 2400, 3200]);
    expect(g.virtualSize).toBe(4000);
  });

  it('slidesPerView:2, 5 slides, 800px container', () => {
    const g = computeGeometry(5, 800, normalizeParams({ slidesPerView: 2 }));
    expect(g.slidesSizesGrid).toEqual([400, 400, 400, 400, 400]);
    expect(g.slidesGrid).toEqual([0, 400, 800, 1200, 1600]);
    expect(g.snapGrid).toEqual([0, 400, 800, 1200]);
  });

  it('slidesPerView:1, spaceBetween:20, 3 slides, 800px container', () => {
    const g = computeGeometry(3, 800, normalizeParams({ slidesPerView: 1, spaceBetween: 20 }));
    expect(g.slidesSizesGrid).toEqual([800, 800, 800]);
    expect(g.slidesGrid).toEqual([0, 820, 1640]);
    expect(g.snapGrid).toEqual([0, 820, 1640]);
  });

  it('returns [0] snapGrid when a single slide fits', () => {
    const g = computeGeometry(1, 800, normalizeParams({ slidesPerView: 1 }));
    expect(g.snapGrid).toEqual([0]);
    expect(g.slidesGrid).toEqual([0]);
  });

  it("slidesPerView:'auto' uses measured per-slide sizes (600px container)", () => {
    const g = computeGeometry(
      4,
      600,
      normalizeParams({ slidesPerView: 'auto' }),
      [200, 300, 150, 400],
    );
    expect(g.slidesSizesGrid).toEqual([200, 300, 150, 400]);
    expect(g.slidesGrid).toEqual([0, 200, 500, 650]);
    // virtualSize 1050; trim snaps <= 1050-600=450 → [0,200]; edge snap 450 appended
    expect(g.snapGrid).toEqual([0, 200, 450]);
    expect(g.virtualSize).toBe(1050);
  });

  it("slidesPerView:'auto' with spaceBetween", () => {
    const g = computeGeometry(
      3,
      600,
      normalizeParams({ slidesPerView: 'auto', spaceBetween: 10 }),
      [200, 300, 150],
    );
    expect(g.slidesSizesGrid).toEqual([200, 300, 150]);
    expect(g.slidesGrid).toEqual([0, 210, 520]);
    // virtualSize 670; trim <= 70 → [0]; edge snap 70 appended
    expect(g.snapGrid).toEqual([0, 70]);
    expect(g.virtualSize).toBe(670);
  });

  it('centeredSlides: slidesPerView 3, 5 slides, 900px container', () => {
    const g = computeGeometry(5, 900, normalizeParams({ slidesPerView: 3, centeredSlides: true }));
    expect(g.slidesSizesGrid).toEqual([300, 300, 300, 300, 300]);
    expect(g.slidesGrid).toEqual([-300, 0, 300, 600, 900]);
    // centered snap grid is NOT trimmed: every slide is a snap
    expect(g.snapGrid).toEqual([-300, 0, 300, 600, 900]);
    // physical offsets are the plain cumulative positions
    expect(g.offsetsGrid).toEqual([0, 300, 600, 900, 1200]);
    expect(g.virtualSize).toBe(1500);
  });

  it('centeredSlides slidesPerView 1 equals non-centered (full-width slides)', () => {
    const centered = computeGeometry(
      5,
      800,
      normalizeParams({ slidesPerView: 1, centeredSlides: true }),
    );
    const plain = computeGeometry(5, 800, normalizeParams({ slidesPerView: 1 }));
    // a full-width slide is already centered, so every grid is identical
    expect(centered.slidesGrid).toEqual([0, 800, 1600, 2400, 3200]);
    expect(centered.slidesGrid).toEqual(plain.slidesGrid);
    expect(centered.snapGrid).toEqual(plain.snapGrid);
    expect(centered.offsetsGrid).toEqual(plain.offsetsGrid);
    expect(centered.slidesSizesGrid).toEqual(plain.slidesSizesGrid);
    expect(centered.virtualSize).toBe(plain.virtualSize);
  });

  it('non-centered offsetsGrid equals slidesGrid', () => {
    const g = computeGeometry(5, 800, normalizeParams({ slidesPerView: 1 }));
    expect(g.offsetsGrid).toEqual(g.slidesGrid);
  });
});
