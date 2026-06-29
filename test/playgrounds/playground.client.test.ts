import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../playground/App.vue';

describe('playground — client', () => {
  it('renders both kit columns (props-driven + external :host)', () => {
    const wrapper = mount(App, { attachTo: document.body });
    // Column A (props-driven) + column B (external :host) each render a .v-surfer root.
    expect(wrapper.findAll('.v-surfer').length).toBeGreaterThanOrEqual(2);
    expect(wrapper.findAll('.v-surfer-slide').length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('renders the grouped control surface + live event panel', () => {
    const wrapper = mount(App, { attachTo: document.body });
    const text = wrapper.text();
    // Control group headings.
    for (const group of [
      'Layout',
      'Behavior',
      'Touch',
      'Free mode',
      'Virtual',
      'Effect',
      'Modules',
      'Events',
    ]) {
      expect(text).toContain(group);
    }
    // Representative controls across groups + a module toggle.
    for (const opt of ['slidesPerView', 'resistanceRatio', 'momentumBounce', 'navigation']) {
      expect(text).toContain(opt);
    }
    wrapper.unmount();
  });
});
