import { describe, it, expect, afterAll } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { slideClassNames, surferContainerClassNames } from '../../src/headless/classes';
import { golden } from '../golden/golden';

// DOM environment (happy-dom) reports offsetLeft=0 for every element, so frozen's
// updateSlidesProgress sees surferSlideOffset=0 for all slides and marks every slide
// visible. The engine uses its computed offsetsGrid (correct geometry), so only truly
// in-viewport slides get isVisible/isFullyVisible. Filter these out of the oracle
// so we compare only the classes the headless engine can determine without a layout engine.
const SLIDE_ENV_CLASSES = ['v-surfer-slide-visible', 'v-surfer-slide-fully-visible'];

const g = golden('class-names');
afterAll(() => g.save());

describe('class names — engine vs frozen (LTR, non-loop)', () => {
  it('container classes match for a basic horizontal surfer', () => {
    const engine = createEngine({ slidesPerView: 1, spaceBetween: 0 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));

    expect(surferContainerClassNames(engine.state).sort()).toEqual(
      g.expected('container-basic-horizontal'),
    );
  });

  it('per-slide classes match across the active range', () => {
    const engine = createEngine({ slidesPerView: 2, spaceBetween: 0 });
    engine.setGeometry({ containerSize: 800 });
    engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));

    for (const target of [0, 1, 3]) {
      engine.slideTo(target, { speed: 0 });
      engine.state.slides.forEach((s, i) => {
        const engineClasses = slideClassNames(s).filter((c) => !SLIDE_ENV_CLASSES.includes(c));
        expect(engineClasses.sort()).toEqual(g.expected(`slide-classes-target${target}-slide${i}`));
      });
    }
  });
});
