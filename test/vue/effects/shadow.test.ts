import { describe, it, expect } from 'vitest';
import { ensureShadow, removeShadows } from '../../../src/vue/effects/shadow';

describe('shadow helper', () => {
  it('creates a shadow child once and reuses it', () => {
    const slide = document.createElement('div');
    const a = ensureShadow(slide, 'v-surfer-slide-shadow v-surfer-slide-shadow-left');
    const b = ensureShadow(slide, 'v-surfer-slide-shadow v-surfer-slide-shadow-left');
    expect(a).toBe(b);
    expect(slide.querySelectorAll('.v-surfer-slide-shadow-left').length).toBe(1);
  });
  it('removes shadows by selector', () => {
    const slide = document.createElement('div');
    ensureShadow(slide, 'v-surfer-slide-shadow v-surfer-slide-shadow-left');
    removeShadows(slide, '.v-surfer-slide-shadow');
    expect(slide.querySelector('.v-surfer-slide-shadow')).toBeNull();
  });
});
