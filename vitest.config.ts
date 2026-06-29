import path from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { isSilencedWarning } from './test/setup/known-warnings';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    // Drop expected, noise-only Vue dev warnings (see test/setup/known-warnings.ts) from
    // node-environment projects. Inherited by all projects via `extends: true`; browser-mode
    // logs are forwarded through Vite's bridge and filtered in-page instead (see the browser
    // project's silence-known-warnings.ts setup file).
    onConsoleLog(log) {
      if (isSilencedWarning(log)) return false;
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      include: ['src/headless/**', 'src/vue/**'],
      exclude: ['src/**/*.d.ts', 'dist/**', '**/*.config.*'],
      reportsDirectory: './test-results/coverage',
      // Regression-floor ratchet (set after Wave 3). The behavior/module suites import
      // src/ and measure here; the real-browser suites run the dist BUNDLE, so their
      // gesture/layout/transform execution is exercised-but-unmeasured against src/.
      // The spec's aspirational 85% is therefore not reachable with this architecture
      // (the uncovered remainder is overwhelmingly browser-only touch/gesture code).
      // These floors sit ~1–1.5pt below the achieved numbers to catch real regressions
      // without flaking (v8 coverage is deterministic). Raise as coverage grows.
      thresholds: {
        lines: 44,
        functions: 54,
        statements: 42,
        branches: 29,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          setupFiles: ['./test/setup/dom-shims.ts', './test/setup/register-serializer.ts'],
          include: [
            'test/setup/**/*.test.ts',
            'test/harness/**/*.test.ts',
            'test/playgrounds/**/*.test.ts',
            'test/**/*.client.test.ts',
            'test/golden/**/*.test.ts',
            'test/build/**/*.test.ts',
            'test/headless/**/*.test.ts',
            'test/vue/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ssr',
          environment: 'node',
          setupFiles: ['./test/setup/register-serializer.ts'],
          include: ['test/smoke.ssr.test.ts', 'test/**/*.ssr.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.browser.test.ts'],
          setupFiles: [
            './test/setup/register-serializer.ts',
            './test/setup/silence-known-warnings.ts',
          ],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            // Server-side bridge so browser-page tests can read/write golden
            // fixtures on disk (browser pages have no `node:fs`).
            commands: {
              goldenRead(_ctx: unknown, name: string) {
                const file = path.resolve(__dirname, 'test/golden/__fixtures__', `${name}.json`);
                const capture = process.env.CAPTURE_GOLDEN === '1';
                const store = existsSync(file)
                  ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>)
                  : {};
                return { capture, store };
              },
              goldenWrite(_ctx: unknown, name: string, store: Record<string, unknown>) {
                const dir = path.resolve(__dirname, 'test/golden/__fixtures__');
                mkdirSync(dir, { recursive: true });
                writeFileSync(
                  path.join(dir, `${name}.json`),
                  `${JSON.stringify(store, null, 2)}\n`,
                );
              },
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          environment: 'node',
          include: ['test/types/**/*.test-d.ts'],
          typecheck: {
            enabled: true,
            only: true,
            tsconfig: './tsconfig.types.json',
            include: ['test/types/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
});
