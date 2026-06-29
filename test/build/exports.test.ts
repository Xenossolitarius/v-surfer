import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = resolve(__dirname, '../../dist');
const exportsMap: Record<string, unknown> = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/copy/package.json'), 'utf8'),
).exports;

// Flatten the exports map into { subpath, kind: 'types'|'default'|'string', target } rows.
type Row = { subpath: string; kind: 'types' | 'default' | 'string'; target: string };
const rows: Row[] = [];
for (const [subpath, value] of Object.entries(exportsMap)) {
  if (typeof value === 'string') {
    rows.push({ subpath, kind: 'string', target: value });
  } else if (value && typeof value === 'object') {
    const v = value as Record<string, string>;
    if (v.types) rows.push({ subpath, kind: 'types', target: v.types });
    if (v.default) rows.push({ subpath, kind: 'default', target: v.default });
  }
}

const distPathOf = (target: string) => join(distDir, target.replace(/^\.\//, ''));

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('build/exports integrity', () => {
  it('dist/ exists (run `pnpm build` first)', () => {
    expect(existsSync(distDir)).toBe(true);
  });

  it('the exports map produced at least the core subpaths', () => {
    const subpaths = rows.map((r) => r.subpath);
    for (const required of ['.', './vue', './nuxt', './css']) {
      expect(subpaths).toContain(required);
    }
  });

  it('the legacy ./core and ./bundle subpaths are absent (Vue-only contract)', () => {
    const subpaths = rows.map((r) => r.subpath);
    for (const banned of ['./core', './bundle']) {
      expect(subpaths).not.toContain(banned);
    }
  });

  it.each(rows)('exports "$subpath" ($kind) → $target resolves to an existing dist file', ({ target }) => {
    expect(existsSync(distPathOf(target))).toBe(true);
  });

  it.each(rows.filter((r) => r.kind === 'types'))(
    'types entry "$subpath" points at a .d.ts file ($target)',
    ({ target }) => {
      expect(target.endsWith('.d.ts')).toBe(true);
    },
  );

  const importable = rows.filter(
    (r) => (r.kind === 'default' || r.kind === 'string') && r.target.endsWith('.mjs'),
  );
  it.each(importable)('ESM entry "$subpath" imports without throwing ($target)', async ({ target }) => {
    const mod = await import(pathToFileURL(distPathOf(target)).href);
    expect(mod).toBeTruthy();
  });

  it('emits no minified or source-map artifacts', () => {
    const offenders = walk(distDir)
      .filter((f) => /\.min\.(mjs|css)$/.test(f) || f.endsWith('.map'))
      .map((f) => f.slice(distDir.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the banner carries no build-specific date', () => {
    const head = readFileSync(join(distDir, 'vue.mjs'), 'utf8').slice(0, 400);
    expect(head).toContain('* v-surfer ');
    expect(head).not.toMatch(/Released on/);
  });
});
