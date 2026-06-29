import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroAutoplay from '../harness/HeroAutoplay.vue';
import { makeGames } from '../harness/fixtures';

describe('HeroAutoplay — client', () => {
  it('renders all slides and engages loop mode', () => {
    const wrapper = mount(HeroAutoplay, {
      props: { games: makeGames(8) },
      attachTo: document.body,
    });
    // jsdom has no real layout, so Surfer does not materialize loop clones here;
    // it does mark slides with data-v-surfer-slide-index, which proves loop mode is active.
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBeGreaterThanOrEqual(8);
    expect(wrapper.findAll('img.hero-tile').length).toBeGreaterThanOrEqual(8);
    expect(slides.every((s) => s.attributes('data-v-surfer-slide-index') !== undefined)).toBe(true);
    wrapper.unmount();
  });

  it('matches DOM snapshot', () => {
    // autoplay disabled here so the snapshot is a deterministic init frame
    // (autoplay timing differs across DOM engines); autoplay behavior is covered
    // by the autoplay module suite and the real-browser suite.
    const wrapper = mount(HeroAutoplay, {
      props: { games: makeGames(8), autoplay: false },
      attachTo: document.body,
    });
    expect(wrapper.element).toMatchSnapshot();
    wrapper.unmount();
  });
});
