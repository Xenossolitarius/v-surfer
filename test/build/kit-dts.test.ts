import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(__dirname, '../../dist');

describe('kit declarations shipped to dist (run `pnpm build` first)', () => {
  it('emits the kit barrel + a headless dependency d.ts', () => {
    expect(existsSync(resolve(dist, 'vue/index.d.ts'))).toBe(true);
    expect(existsSync(resolve(dist, 'vue/surfer.d.ts'))).toBe(true);
    expect(existsSync(resolve(dist, 'headless/types.d.ts'))).toBe(true);
  });

  it('the barrel d.ts re-exports the expanded component surface', () => {
    const dts = readFileSync(resolve(dist, 'vue/index.d.ts'), 'utf8');
    expect(dts).toContain('Navigation');
    expect(dts).toContain('EffectCards');
  });
});
