/** Pure port of the frozen `Virtual.update` window math (no DOM, no state). */

/** Physical render window: positions [from..to] inclusive, shifted by `offset` px. */
export interface VirtualWindow {
  from: number;
  to: number;
  offset: number;
}

export interface VirtualWindowInput {
  activeIndex: number;
  /** Engine grid over the current order (loopOrder under loop), px positions. */
  slidesGrid: number[];
  /** Rendered-order length (loopOrder.length under loop, else slide count). */
  slidesLength: number;
  /** Numeric only this slice. */
  slidesPerView: number;
  slidesPerGroup: number;
  centeredSlides: boolean;
  loop: boolean;
  addSlidesBefore: number;
  addSlidesAfter: number;
}

// Port of `src/modules/virtual/virtual.ts` update() from/to/offset (lines 110-132).
export function virtualWindow(input: VirtualWindowInput): VirtualWindow {
  const {
    activeIndex,
    slidesGrid,
    slidesLength,
    slidesPerView: spv,
    slidesPerGroup: spg,
    centeredSlides,
    loop,
    addSlidesBefore,
    addSlidesAfter,
  } = input;

  const slidesAfter = centeredSlides
    ? Math.floor(spv / 2) + spg + addSlidesAfter
    : spv + (spg - 1) + addSlidesAfter;
  const slidesBefore = centeredSlides
    ? Math.floor(spv / 2) + spg + addSlidesBefore
    : (loop ? spv : spg) + addSlidesBefore;

  let from = activeIndex - slidesBefore;
  let to = activeIndex + slidesAfter;
  if (!loop) {
    from = Math.max(from, 0);
    to = Math.min(to, slidesLength - 1);
  }
  let offset = (slidesGrid[from] || 0) - (slidesGrid[0] || 0);
  if (loop && activeIndex >= slidesBefore) {
    from -= slidesBefore;
    if (!centeredSlides) offset += slidesGrid[0] || 0;
  } else if (loop && activeIndex < slidesBefore) {
    from = -slidesBefore;
    if (centeredSlides) offset += slidesGrid[0] || 0;
  }
  return { from, to, offset };
}
