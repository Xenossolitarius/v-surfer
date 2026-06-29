import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GameRow from '../harness/GameRow.vue';
import { makeGames } from '../harness/fixtures';

describe('GameRow (gameimg) — client', () => {
  it('renders one image slide per game and the title in container-start', () => {
    const wrapper = mount(GameRow, {
      props: { games: makeGames(8), title: 'Top games' },
      attachTo: document.body,
    });
    expect(wrapper.findAll('.v-surfer-slide').length).toBe(8);
    expect(wrapper.findAll('img.game-tile').length).toBe(8);
    expect(wrapper.find('.game-row__title').text()).toBe('Top games');
    wrapper.unmount();
  });

  it('renders skeleton tiles while loading', () => {
    const wrapper = mount(GameRow, {
      props: { games: [], loading: true, skeletonCount: 6 },
      attachTo: document.body,
    });
    expect(wrapper.findAll('.game-tile--skeleton').length).toBe(6);
    wrapper.unmount();
  });

  it('matches DOM snapshot', () => {
    const wrapper = mount(GameRow, { props: { games: makeGames(5) }, attachTo: document.body });
    expect(wrapper.element).toMatchSnapshot();
    wrapper.unmount();
  });
});
