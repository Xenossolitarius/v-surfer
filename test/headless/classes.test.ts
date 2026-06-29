import { describe, it, expect } from 'vitest';
import { slideClassNames, surferContainerClassNames } from '../../src/headless/classes';
import { createEngine } from '../../src/headless/engine';

const flags = (
  o: Partial<Record<'isActive' | 'isPrev' | 'isNext' | 'isVisible' | 'isFullyVisible', boolean>>,
) => ({
  isActive: false,
  isPrev: false,
  isNext: false,
  isVisible: false,
  isFullyVisible: false,
  ...o,
});

describe('slideClassNames', () => {
  it('base only when no flags set', () => {
    expect(slideClassNames(flags({}))).toEqual(['v-surfer-slide']);
  });

  it('adds each state class for its flag', () => {
    expect(
      slideClassNames(flags({ isActive: true, isVisible: true, isFullyVisible: true })),
    ).toEqual([
      'v-surfer-slide',
      'v-surfer-slide-active',
      'v-surfer-slide-visible',
      'v-surfer-slide-fully-visible',
    ]);
    expect(slideClassNames(flags({ isPrev: true }))).toContain('v-surfer-slide-prev');
    expect(slideClassNames(flags({ isNext: true }))).toContain('v-surfer-slide-next');
  });
});

describe('surferContainerClassNames', () => {
  it('horizontal default', () => {
    const e = createEngine({});
    expect(surferContainerClassNames(e.state)).toEqual(['v-surfer', 'v-surfer-horizontal']);
  });

  it('vertical + rtl + free-mode + virtual', () => {
    const e = createEngine({ direction: 'vertical', rtl: true, freeMode: true, virtual: true });
    const c = surferContainerClassNames(e.state);
    expect(c).toContain('v-surfer');
    expect(c).toContain('v-surfer-vertical');
    expect(c).toContain('v-surfer-rtl');
    expect(c).toContain('v-surfer-free-mode');
    expect(c).toContain('v-surfer-virtual');
    expect(c).not.toContain('v-surfer-css-mode');
  });

  it('css-mode adds v-surfer-css-mode; centered only with cssMode', () => {
    expect(surferContainerClassNames(createEngine({ cssMode: true }).state)).toContain(
      'v-surfer-css-mode',
    );
    // centeredSlides WITHOUT cssMode → no v-surfer-centered (frozen gates it on cssMode)
    expect(surferContainerClassNames(createEngine({ centeredSlides: true }).state)).not.toContain(
      'v-surfer-centered',
    );
    expect(
      surferContainerClassNames(createEngine({ cssMode: true, centeredSlides: true }).state),
    ).toContain('v-surfer-centered');
  });
});
