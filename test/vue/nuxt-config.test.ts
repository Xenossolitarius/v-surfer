import { describe, it, expect } from 'vitest';
import { resolveModuleSetup } from '../../src/vue/nuxt-config';

describe('resolveModuleSetup — components', () => {
  it('default: 16 components, Surfer prefix, from v-surfer/vue', () => {
    const { components } = resolveModuleSetup();
    expect(components).toHaveLength(16);
    expect(components.every((c) => c.filePath === 'v-surfer/vue')).toBe(true);
    expect(components.find((c) => c.export === 'Surfer')).toEqual({
      name: 'Surfer',
      export: 'Surfer',
      filePath: 'v-surfer/vue',
    });
    expect(components.find((c) => c.export === 'Item')?.name).toBe('SurferItem');
    expect(components.find((c) => c.export === 'EffectCards')?.name).toBe('SurferEffectCards');
  });

  it('custom prefix renames every component (root = bare prefix)', () => {
    const { components } = resolveModuleSetup({ prefix: 'Foo' });
    expect(components.find((c) => c.export === 'Surfer')?.name).toBe('Foo');
    expect(components.find((c) => c.export === 'Item')?.name).toBe('FooItem');
  });

  it('components: false registers none', () => {
    expect(resolveModuleSetup({ components: false }).components).toEqual([]);
  });
});

describe('resolveModuleSetup — css', () => {
  it('default: the everything bundle', () => {
    expect(resolveModuleSetup().css).toEqual(['v-surfer/css']);
  });

  it('css: false ships no stylesheet', () => {
    expect(resolveModuleSetup({ css: false }).css).toEqual([]);
  });

  it('css as an explicit feature list prepends core', () => {
    expect(resolveModuleSetup({ css: ['navigation'] }).css).toEqual([
      'v-surfer/css/core',
      'v-surfer/css/navigation',
    ]);
  });

  it('narrowed effects switch to the granular core+chrome+effects list', () => {
    expect(resolveModuleSetup({ effects: ['fade'] }).css).toEqual([
      'v-surfer/css/core',
      'v-surfer/css/navigation',
      'v-surfer/css/pagination',
      'v-surfer/css/scrollbar',
      'v-surfer/css/a11y',
      'v-surfer/css/free-mode',
      'v-surfer/css/effect-fade',
    ]);
  });
});

describe('resolveModuleSetup — module auto-imports', () => {
  it('exposes the 14 module objects, all from v-surfer/vue', () => {
    const { imports } = resolveModuleSetup();
    expect(imports).toHaveLength(14);
    expect(imports.every((i) => i.from === 'v-surfer/vue')).toBe(true);
    const names = imports.map((i) => i.name);
    expect(names).toContain('NavigationModule');
    expect(names).toContain('EffectCardsModule');
    // module objects only — never the components
    expect(names.every((n) => n.endsWith('Module'))).toBe(true);
    expect(names).not.toContain('Surfer');
  });

  it('module imports are independent of components: false', () => {
    expect(resolveModuleSetup({ components: false }).imports).toHaveLength(14);
  });
});
