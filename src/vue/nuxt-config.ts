/** Options for the `v-surfer/nuxt` module (configKey `surferX`). */
export interface VSurferModuleOptions {
  /** `true` (default) ships all CSS; `false` ships none; a string[] is an explicit feature list (core is always prepended). */
  css?: boolean | string[];
  /** Auto-register the kit components (default `true`). */
  components?: boolean;
  /** Component name prefix (default `'Surfer'`): root is `<Surfer>`, others `<Surfer{Name}>`. */
  prefix?: string;
  /** Which effect CSS to include when `css` is `true` (default `'all'`). */
  effects?: 'all' | string[];
}

export interface ResolvedComponent {
  name: string;
  export: string;
  filePath: string;
}

/** A Nuxt auto-import: `name` is auto-imported from `from` (shape of @nuxt/kit's `addImports`). */
export interface ResolvedImport {
  name: string;
  from: string;
}

export interface ResolvedSetup {
  css: string[];
  components: ResolvedComponent[];
  imports: ResolvedImport[];
}

const CHROME = ['navigation', 'pagination', 'scrollbar', 'a11y', 'free-mode'];
// The module objects paired with each component — auto-imported so consumers can write
// `:modules="[NavigationModule]"` without an import. Nuxt tree-shakes unused auto-imports,
// so registering all 14 is free. Independent of component registration.
const MODULE_EXPORTS = [
  'NavigationModule',
  'PaginationModule',
  'ScrollbarModule',
  'KeyboardModule',
  'MousewheelModule',
  'ControllerModule',
  'AutoplayModule',
  'A11yModule',
  'EffectFadeModule',
  'EffectFlipModule',
  'EffectCoverflowModule',
  'EffectCreativeModule',
  'EffectCubeModule',
  'EffectCardsModule',
];
const COMPONENT_EXPORTS = [
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

function resolveCss(options: VSurferModuleOptions): string[] {
  const css = options.css ?? true;
  if (css === false) return [];
  if (Array.isArray(css)) return ['v-surfer/css/core', ...css.map((f) => `v-surfer/css/${f}`)];
  const effects = options.effects ?? 'all';
  if (effects === 'all') return ['v-surfer/css'];
  return [
    'v-surfer/css/core',
    ...CHROME.map((c) => `v-surfer/css/${c}`),
    ...effects.map((e) => `v-surfer/css/effect-${e}`),
  ];
}

/** Resolve module options into the CSS specifiers + component registrations Nuxt should apply. */
export function resolveModuleSetup(options: VSurferModuleOptions = {}): ResolvedSetup {
  const prefix = options.prefix ?? 'Surfer';
  const components: ResolvedComponent[] =
    options.components === false
      ? []
      : COMPONENT_EXPORTS.map((exp) => ({
          name: exp === 'Surfer' ? prefix : `${prefix}${exp}`,
          export: exp,
          filePath: 'v-surfer/vue',
        }));
  const imports: ResolvedImport[] = MODULE_EXPORTS.map((name) => ({
    name,
    from: 'v-surfer/vue',
  }));
  return { css: resolveCss(options), components, imports };
}
