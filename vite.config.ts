import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');
const copyDir = resolve(src, 'copy');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// Vue-Kit stylesheet list (its own source of truth under src/vue/styles/).
const KIT_STYLES = [
  'core',
  'navigation',
  'pagination',
  'scrollbar',
  'a11y',
  'free-mode',
  'effect-fade',
  'effect-flip',
  'effect-coverflow',
  'effect-creative',
  'effect-cube',
  'effect-cards',
];

const banner = [
  '/**',
  ` * v-surfer ${pkg.version}`,
  ` * ${pkg.description}`,
  ` * ${pkg.homepage}`,
  ' *',
  ` * Copyright 2014-2026 ${pkg.author}`,
  ' *',
  ` * Released under the ${pkg.license} License`,
  ' */',
].join('\n');

const entries: Record<string, string> = {
  vue: resolve(src, 'vue/index.ts'),
  nuxt: resolve(src, 'vue/nuxt.ts'),
};

// Vite's lib mode honors neither `rollupOptions.output.banner` nor a renderChunk
// banner, so prepend the license header to every emitted chunk in generateBundle.
function bannerPlugin(): Plugin {
  return {
    name: 'v-surfer:banner',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          file.code = `${banner}\n${file.code}`;
        }
      }
    },
  };
}

const autoprefix = async (css: string): Promise<string> => {
  const result = await postcss([autoprefixer]).process(css, { from: undefined });
  result.warnings().forEach((w) => console.warn(w.toString()));
  return result.css;
};

// Kit CSS — emit dist/vue.css (everything) + dist/styles/<name>.css per feature.
function vSurferKitCssPlugin(): Plugin {
  return {
    name: 'v-surfer-kit:css',
    async closeBundle() {
      const stylesDir = resolve(src, 'vue/styles');
      const parts = KIT_STYLES.map((n) => readFileSync(resolve(stylesDir, `${n}.css`), 'utf8'));
      mkdirSync(resolve(dist, 'styles'), { recursive: true });
      for (let i = 0; i < KIT_STYLES.length; i += 1) {
        writeFileSync(
          resolve(dist, `styles/${KIT_STYLES[i]}.css`),
          `${banner}\n${await autoprefix(parts[i])}`,
        );
      }
      writeFileSync(resolve(dist, 'vue.css'), `${banner}\n${await autoprefix(parts.join('\n'))}`);
    },
  };
}

// Recursively copy every hand-authored .d.ts from `fromDir` into `toDir`,
// preserving structure. Dirs are only created when they contain a .d.ts.
function copyDts(fromDir: string, toDir: string): void {
  for (const e of readdirSync(fromDir, { withFileTypes: true })) {
    const from = join(fromDir, e.name);
    if (e.isDirectory()) {
      copyDts(from, join(toDir, e.name));
    } else if (e.name.endsWith('.d.ts')) {
      mkdirSync(toDir, { recursive: true });
      writeFileSync(join(toDir, e.name), readFileSync(from));
    }
  }
}

// Kit type declarations — generate src/**/*.d.ts via tsconfig.build.json, then copy
// ONLY the frozen-free kit + headless subtrees into dist (so ./vue and ./nuxt are typed).
function vSurferKitDtsPlugin(): Plugin {
  return {
    name: 'v-surfer-kit:dts',
    closeBundle() {
      const staging = resolve(root, 'test-results/dts-staging');
      // tsc does not clean its outDir, so a renamed/removed source file leaves a stale
      // .d.ts behind that copyDts would then ship. Wipe staging first for a faithful emit.
      rmSync(staging, { recursive: true, force: true });
      execSync('npx tsc -p tsconfig.build.json', { cwd: root, stdio: 'inherit' });
      copyDts(resolve(staging, 'vue'), resolve(dist, 'vue'));
      copyDts(resolve(staging, 'headless'), resolve(dist, 'headless'));
    },
  };
}

// Copy published metadata + hand-authored types, then stub missing CSS .d.ts.
function vSurferCopyPlugin(): Plugin {
  return {
    name: 'v-surfer:copy',
    closeBundle() {
      // 1. src/copy/* -> dist (package.json, README.md, LICENSE)
      for (const name of readdirSync(copyDir)) {
        writeFileSync(resolve(dist, name), readFileSync(resolve(copyDir, name)));
      }
      // 2. every hand-authored .d.ts -> dist (preserves structure)
      copyDts(src, dist);
      // 3. `export {};` stub for each CSS export whose types target is missing
      const distPkg = JSON.parse(readFileSync(resolve(dist, 'package.json'), 'utf8'));
      for (const entry of Object.values(distPkg.exports) as unknown[]) {
        if (
          entry &&
          typeof entry === 'object' &&
          typeof (entry as Record<string, string>).default === 'string' &&
          (entry as Record<string, string>).default.endsWith('.css') &&
          typeof (entry as Record<string, string>).types === 'string'
        ) {
          const target = resolve(dist, (entry as Record<string, string>).types);
          if (!existsSync(target)) {
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, 'export {};\n');
          }
        }
      }
    },
  };
}

export default defineConfig({
  build: {
    target: 'es2025',
    minify: false,
    sourcemap: false,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: entries,
      formats: ['es'],
      fileName: (_format, name) => `${name}.mjs`,
    },
    rollupOptions: {
      external: ['vue', '@nuxt/kit'],
      output: {
        chunkFileNames: 'shared/[name].mjs',
      },
    },
  },
  plugins: [bannerPlugin(), vSurferKitCssPlugin(), vSurferKitDtsPlugin(), vSurferCopyPlugin()],
});
