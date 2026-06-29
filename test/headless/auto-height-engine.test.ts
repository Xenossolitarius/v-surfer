import { describe, it, expect } from 'vitest';
import { createEngine } from '../../src/headless/engine';
import { surferContainerClassNames } from '../../src/headless/classes';

describe('engine autoHeight param + layout exposure', () => {
  it('defaults autoHeight off and emits no v-surfer-autoheight class', () => {
    const e = createEngine({});
    expect(e.state.layout.autoHeight).toBe(false);
    expect(surferContainerClassNames(e.state)).not.toContain('v-surfer-autoheight');
  });

  it('exposes autoHeight and resolved slidesPerView on layout', () => {
    const e = createEngine({ autoHeight: true, slidesPerView: 3 });
    expect(e.state.layout.autoHeight).toBe(true);
    expect(e.state.layout.slidesPerView).toBe(3);
  });

  it("exposes slidesPerView 'auto' verbatim", () => {
    const e = createEngine({ slidesPerView: 'auto' });
    expect(e.state.layout.slidesPerView).toBe('auto');
  });

  it('emits v-surfer-autoheight when enabled', () => {
    const e = createEngine({ autoHeight: true });
    expect(surferContainerClassNames(e.state)).toContain('v-surfer-autoheight');
  });
});
