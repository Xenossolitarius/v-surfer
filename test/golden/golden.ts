import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CAPTURE = process.env.CAPTURE_GOLDEN === '1';
const ROOT = resolve(__dirname, '__fixtures__');

/**
 * A golden fixture for one test file. Capture mode (CAPTURE_GOLDEN=1, frozen still present):
 * `expected(key, frozenValue)` records the value and returns it; `save()` writes the JSON.
 * Normal mode (frozen absent): `expected(key)` returns the stored value so the test asserts
 * the engine against it. Keyed by explicit string so assertion order does not matter.
 */
export function golden(name: string): {
  expected: (key: string, frozenValue?: unknown) => unknown;
  save: () => void;
} {
  const path = resolve(ROOT, `${name}.json`);
  const store: Record<string, unknown> =
    !CAPTURE && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  return {
    expected(key: string, frozenValue?: unknown): unknown {
      if (CAPTURE) {
        store[key] = frozenValue;
        return frozenValue;
      }
      if (!(key in store)) {
        throw new Error(`golden[${name}]: missing key '${key}' — recapture the fixture`);
      }
      return store[key];
    },
    save(): void {
      if (!CAPTURE) return;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`);
    },
  };
}
