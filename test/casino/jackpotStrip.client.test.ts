import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JackpotStrip from '../harness/JackpotStrip.vue';
import { makeGames } from '../harness/fixtures';

describe('JackpotStrip — client', () => {
  it('renders slides and navigation buttons', () => {
    const wrapper = mount(JackpotStrip, {
      props: { games: makeGames(6) },
      attachTo: document.body,
    });
    expect(wrapper.findAll('.v-surfer-slide').length).toBe(6);
    expect(wrapper.find('.v-surfer-button-next').exists()).toBe(true);
    expect(wrapper.find('.v-surfer-button-prev').exists()).toBe(true);
    wrapper.unmount();
  });

  it('matches DOM snapshot', () => {
    const wrapper = mount(JackpotStrip, {
      props: { games: makeGames(5) },
      attachTo: document.body,
    });
    expect(wrapper.element).toMatchSnapshot();
    wrapper.unmount();
  });
});
