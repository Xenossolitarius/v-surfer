import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const stylesDir = resolve(__dirname, '../../src/vue/styles');
const read = (f: string): string => readFileSync(resolve(stylesDir, f), 'utf8');

describe('core.css — re-homed + pruned', () => {
  const css = (): string => read('core.css');

  it('keeps the required layout selectors + theme token', () => {
    const c = css();
    for (const sel of [
      '--v-surfer-theme-color',
      '.v-surfer-wrapper',
      '.v-surfer-slide',
      '.v-surfer-vertical',
      '.v-surfer-autoheight',
      '.v-surfer-css-mode',
      '.v-surfer-centered',
      '.v-surfer-free-mode',
      '.v-surfer-3d',
    ]) {
      expect(c, `missing ${sel}`).toContain(sel);
    }
  });

  it('prunes the frozen-only selectors the kit never emits', () => {
    const c = css();
    for (const dead of [
      ':host',
      '.v-surfer-android',
      '.v-surfer-ios',
      '.v-surfer-slide-invisible-blank',
      '.v-surfer-backface-hidden',
    ]) {
      expect(c, `should not contain ${dead}`).not.toContain(dead);
    }
  });
});

describe('feature stylesheets — verbatim copies', () => {
  it.each([
    ['navigation.css', '.v-surfer-button-next'],
    ['pagination.css', '.v-surfer-pagination-bullet'],
    ['scrollbar.css', '.v-surfer-scrollbar'],
    ['a11y.css', '.v-surfer-notification'],
    ['free-mode.css', '.v-surfer-free-mode'],
    ['effect-fade.css', '.v-surfer-fade'],
    ['effect-flip.css', '.v-surfer-flip'],
    ['effect-coverflow.css', '.v-surfer-coverflow'],
    ['effect-creative.css', '.v-surfer-creative'],
    ['effect-cube.css', '.v-surfer-cube'],
    ['effect-cards.css', '.v-surfer-cards'],
  ])('%s exists and carries its sentinel selector %s', (file, sentinel) => {
    expect(read(file)).toContain(sentinel);
  });

  it('index.css @imports core first, then every feature file', () => {
    const idx = read('index.css');
    for (const f of [
      'core.css',
      'navigation.css',
      'pagination.css',
      'scrollbar.css',
      'a11y.css',
      'free-mode.css',
      'effect-fade.css',
      'effect-flip.css',
      'effect-coverflow.css',
      'effect-creative.css',
      'effect-cube.css',
      'effect-cards.css',
    ]) {
      expect(idx, `index.css missing @import ${f}`).toContain(`@import './${f}'`);
    }
    expect(idx.indexOf('core.css')).toBeLessThan(idx.indexOf('navigation.css'));
  });
});
