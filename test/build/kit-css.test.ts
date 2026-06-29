import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(__dirname, '../../dist');
const KIT_STYLES = [
  'core', 'navigation', 'pagination', 'scrollbar', 'a11y', 'free-mode',
  'effect-fade', 'effect-flip', 'effect-coverflow', 'effect-creative', 'effect-cube', 'effect-cards',
];

describe('kit CSS build artifacts (run `pnpm build` first)', () => {
  it('emits dist/vue.css and dist/styles/<name>.css for every kit style', () => {
    expect(existsSync(resolve(dist, 'vue.css'))).toBe(true);
    for (const n of KIT_STYLES) {
      expect(existsSync(resolve(dist, `styles/${n}.css`)), `missing styles/${n}.css`).toBe(true);
    }
  });

  it('vue.css merges core layout + chrome, with frozen-only selectors pruned', () => {
    const css = readFileSync(resolve(dist, 'vue.css'), 'utf8');
    expect(css).toContain('.v-surfer-wrapper');
    expect(css).toContain('.v-surfer-pagination-bullet');
    expect(css).toContain('.v-surfer-button-next');
    expect(css).not.toContain(':host');
  });
});
