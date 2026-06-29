import { describe, it, expect } from 'vitest';
import * as kit from '../../src/vue/index';

const COMPONENTS = [
  'Surfer',
  'Item',
  'Navigation',
  'Pagination',
  'Scrollbar',
  'Keyboard',
  'Mousewheel',
  'Controller',
  'Autoplay',
  'A11y',
  'EffectFade',
  'EffectFlip',
  'EffectCoverflow',
  'EffectCreative',
  'EffectCube',
  'EffectCards',
];
const MODULES: [string, string][] = [
  ['NavigationModule', 'navigation'],
  ['PaginationModule', 'pagination'],
  ['ScrollbarModule', 'scrollbar'],
  ['KeyboardModule', 'keyboard'],
  ['MousewheelModule', 'mousewheel'],
  ['ControllerModule', 'controller'],
  ['AutoplayModule', 'autoplay'],
  ['A11yModule', 'a11y'],
  ['EffectFadeModule', 'fade'],
  ['EffectFlipModule', 'flip'],
  ['EffectCoverflowModule', 'coverflow'],
  ['EffectCreativeModule', 'creative'],
  ['EffectCubeModule', 'cube'],
  ['EffectCardsModule', 'cards'],
];

describe('vue barrel surface', () => {
  it.each(COMPONENTS)('exports the %s component', (name) => {
    expect((kit as Record<string, unknown>)[name]).toBeDefined();
  });

  it.each(MODULES)('exports %s with key "%s"', (exportName, key) => {
    const mod = (kit as Record<string, { key?: string }>)[exportName];
    expect(mod).toBeDefined();
    expect(mod.key).toBe(key);
  });
});
