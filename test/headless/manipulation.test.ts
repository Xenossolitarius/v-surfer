import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import type { SlideInput } from '../../src/headless/types';

/** spv1 / spaceBetween0 / 800px container ⇒ slidesGrid = [0, 800, 1600, ...]. */
function engine(count: number, params: Record<string, unknown> = {}) {
  const e = createEngine<number>({ slidesPerView: 1, spaceBetween: 0, ...params });
  e.setGeometry({ containerSize: 800 });
  e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
  return e;
}
const item = (n: number): SlideInput<number> => ({ data: n });

describe('insertSlides (lean core, non-loop)', () => {
  it('inserting after the active index leaves activeIndex and translate put', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.insertSlides(5, item(5)); // append
    expect(e.state.slides).toHaveLength(6);
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.translate).toBe(-1600);
  });

  it('inserting at/before the active index shifts activeIndex by the batch size', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.insertSlides(0, [item(-2), item(-1)]); // prepend two
    expect(e.state.slides).toHaveLength(7);
    expect(e.state.activeIndex).toBe(4); // 2 + 2
    expect(e.state.translate).toBe(-3200);
  });

  it('clamps an out-of-range insert position', () => {
    const e = engine(3);
    e.insertSlides(99, item(9)); // clamps to length ⇒ append
    expect(e.state.slides.map((s) => s.data)).toEqual([0, 1, 2, 9]);
    e.insertSlides(-5, item(8)); // clamps to 0 ⇒ prepend
    expect(e.state.slides.map((s) => s.data)).toEqual([8, 0, 1, 2, 9]);
  });

  it('ignores an empty batch', () => {
    const e = engine(3);
    e.insertSlides(1, []);
    expect(e.state.slides).toHaveLength(3);
  });
});

describe('removeSlides (lean core, non-loop)', () => {
  it('removing below the active index decrements activeIndex', () => {
    const e = engine(5);
    e.slideTo(3, { speed: 0 });
    e.removeSlides(0);
    expect(e.state.slides).toHaveLength(4);
    expect(e.state.activeIndex).toBe(2);
  });

  it('removing the active index keeps the number and clamps to range', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.removeSlides(2);
    expect(e.state.activeIndex).toBe(2); // no decrement (2 < 2 is false)
  });

  it('is order-independent and ignores duplicate / out-of-range indexes', () => {
    const e = engine(5);
    e.slideTo(3, { speed: 0 });
    e.removeSlides([99, 0, 0, 1]); // valid: {0,1}, both below active ⇒ -2
    expect(e.state.slides.map((s) => s.data)).toEqual([2, 3, 4]);
    expect(e.state.activeIndex).toBe(1);
  });
});

describe('clearSlides', () => {
  it('empties the set and resets active/translate', () => {
    const e = engine(5);
    e.slideTo(3, { speed: 0 });
    e.clearSlides();
    expect(e.state.slides).toHaveLength(0);
    expect(e.state.activeIndex).toBe(0);
    expect(e.state.translate).toBe(0);
  });
});

describe('frozen-named wrappers (non-loop active-index quirks)', () => {
  it('appendSlide leaves activeIndex unchanged', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.appendSlide(item(5));
    expect(e.state.slides).toHaveLength(6);
    expect(e.state.activeIndex).toBe(2);
  });

  it('prependSlide always shifts activeIndex by the batch size — even at index 0', () => {
    const e = engine(5); // activeIndex starts at 0
    e.prependSlide([item(-2), item(-1)]);
    expect(e.state.activeIndex).toBe(2); // 0 + 2, despite active being 0
  });

  it('addSlide shifts only when index < activeIndex (strict)', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.addSlide(1, item(9)); // 1 < 2 ⇒ shift
    expect(e.state.activeIndex).toBe(3);
  });

  it('addSlide at index === activeIndex does NOT shift (active position shows the new slide)', () => {
    const e = engine(5);
    e.slideTo(2, { speed: 0 });
    e.addSlide(2, item(9)); // 2 < 2 is false ⇒ no shift
    expect(e.state.activeIndex).toBe(2);
    expect(e.state.slides[2].data).toBe(9); // the inserted slide now sits at the active position
  });

  it('addSlide routes index <= 0 to prepend and index >= length to append', () => {
    const e = engine(3);
    e.addSlide(0, item(-1)); // prepend
    expect(e.state.slides.map((s) => s.data)).toEqual([-1, 0, 1, 2]);
    e.addSlide(99, item(9)); // append
    expect(e.state.slides.map((s) => s.data)).toEqual([-1, 0, 1, 2, 9]);
  });

  it('removeSlide delegates to removeSlides; removeAllSlides empties the set', () => {
    const e = engine(5);
    e.slideTo(3, { speed: 0 });
    e.removeSlide([0, 1]);
    expect(e.state.activeIndex).toBe(1);
    e.removeAllSlides();
    expect(e.state.slides).toHaveLength(0);
    expect(e.state.activeIndex).toBe(0);
  });
});

describe('clearSlides vs removeAllSlides empty-state divergence', () => {
  // clearSlides hard-resets activeIndex to 0; removeAllSlides runs the oracle's
  // per-slide decrement loop and preserves the resulting (non-zero) index in the
  // empty state. The empty-state activeIndex is consumed by insertAt on the next
  // re-add, so the two methods land at different positions after a batch appendSlide.
  it('clearSlides resets active to 0 while removeAllSlides preserves the decremented index', () => {
    const slides3 = [{ data: 10 }, { data: 11 }, { data: 12 }];

    // Engine A: removeAllSlides — active=4, n=6. The running-decrement in
    // removeSlides forEach (Set insertion order: 0,1,2,3,4,5) against nextActive=4:
    //   0 < 4 → 3;  1 < 3 → 2;  2 < 2? no;  3 < 2? no;  4 < 2? no;  5 < 2? no.
    // Empty-state activeIndex = 2 (run-verified).
    const eRemove = engine(6);
    eRemove.slideTo(4, { speed: 0 });
    eRemove.removeAllSlides();
    expect(eRemove.state.slides).toHaveLength(0);
    expect(eRemove.state.activeIndex).toBe(2);

    // Batch-append 3 slides. insertAt reads loopOrder[activeIndex=2] ?? 2 = 2 as
    // baseActive; applyMutation clamps min(2, 3-1)=2 → active lands at 2.
    eRemove.appendSlide(slides3);
    expect(eRemove.state.activeIndex).toBe(2);

    // Engine B: clearSlides — always resets to 0 regardless of prior active.
    const eClear = engine(6);
    eClear.slideTo(4, { speed: 0 });
    eClear.clearSlides();
    expect(eClear.state.slides).toHaveLength(0);
    expect(eClear.state.activeIndex).toBe(0);

    eClear.appendSlide(slides3);
    expect(eClear.state.activeIndex).toBe(0);

    // The two engines must land at different positions after the same re-add.
    expect(eRemove.state.activeIndex).not.toBe(eClear.state.activeIndex);
  });
});

describe('manipulation under loop (rotation re-derivation)', () => {
  // Synchronous scheduler so deferred loop-wrap finals settle inline for assertions.
  function loopEngine(count: number) {
    const e = createEngine<number>(
      { slidesPerView: 1, spaceBetween: 0, loop: true },
      { scheduler: (fn) => fn() },
    );
    e.setGeometry({ containerSize: 800 });
    e.setSlides(Array.from({ length: count }, (_, i) => ({ data: i })));
    return e;
  }

  it('append preserves the active real index', () => {
    const e = loopEngine(6);
    e.slideToLoop(3, { speed: 0 });
    expect(e.state.realIndex).toBe(3);
    e.appendSlide({ data: 6 });
    expect(e.state.slides).toHaveLength(7);
    expect(e.state.realIndex).toBe(3);
  });

  it('removing a non-active slide keeps the active real index visible', () => {
    const e = loopEngine(6);
    e.slideToLoop(4, { speed: 0 });
    e.removeSlide(0);
    expect(e.state.slides).toHaveLength(5);
    // real 4 shifts down by one removed-below ⇒ real 3 (frozen decrement rule)
    expect(e.state.realIndex).toBe(3);
  });

  it('clearing then re-adding under loop resets to a valid state', () => {
    const e = loopEngine(6);
    e.slideToLoop(2, { speed: 0 });
    e.removeAllSlides();
    expect(e.state.slides).toHaveLength(0);
    // The frozen oracle calls slideTo(newActiveIndex + loopedSlidesCount) after
    // removeAllSlides under loop. The engine's nextActive (derived from the real slide
    // index via loopOrder) already equals the oracle's (newActiveIndex + loopedSlidesCount),
    // so activeIndex = nextActive = 1 for this config (slidesPerGroup=1, loopAdditionalSlides=0).
    expect(e.state.activeIndex).toBe(1);
  });
});
