import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ChipSlider from '../harness/ChipSlider.vue';

const CHIPS = ['All', 'Slots', 'Live', 'Table', 'Jackpot', 'New'];

describe('ChipSlider — client', () => {
  it('renders a slide per chip and starts at the beginning', () => {
    const wrapper = mount(ChipSlider, { props: { chips: CHIPS }, attachTo: document.body });
    expect(wrapper.findAll('.v-surfer-slide').length).toBe(CHIPS.length);
    expect(wrapper.findAll('.chip').length).toBe(CHIPS.length);
    expect(wrapper.classes()).toContain('start');
    wrapper.unmount();
  });

  it('matches DOM snapshot', () => {
    const wrapper = mount(ChipSlider, { props: { chips: CHIPS }, attachTo: document.body });
    expect(wrapper.element).toMatchSnapshot();
    wrapper.unmount();
  });

  // Verifies the @surfer event handler in ChipSlider ran and stored the instance.
  // (The isBeginning/isEnd toggle under navigation is exercised in navigation.client.test.ts
  // with a vanilla Surfer — ChipSlider's freeMode + slidesPerView:"auto" makes both
  // isBeginning and isEnd true under jsdom's fixed sizes, so the toggle can't move here.)
  it('@surfer instance is captured via onSurfer callback', async () => {
    const MANY = ['All', 'Slots', 'Live', 'Table', 'Jackpot', 'New', 'Drops', 'Megaways'];
    const wrapper = mount(ChipSlider, { props: { chips: MANY }, attachTo: document.body });
    await wrapper.vm.$nextTick();
    const surfer = (wrapper.vm as unknown as { getSurfer(): unknown }).getSurfer();
    expect(surfer).toBeDefined();
    expect(wrapper.classes()).toContain('start');
    wrapper.unmount();
  });
});
