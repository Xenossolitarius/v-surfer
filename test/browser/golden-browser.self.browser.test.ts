import { describe, it, expect } from 'vitest';
import { goldenBrowser } from '../golden/golden-browser';

// In normal mode the helper reads committed fixtures; this self-test exercises
// the replay path against a checked-in fixture:
//   test/golden/__fixtures__/golden-browser-self.json => { "n": 42 }
describe('goldenBrowser helper (replay mode)', () => {
  it('returns the stored value for a known key', async () => {
    const g = await goldenBrowser('golden-browser-self');
    expect(g.expected('n')).toBe(42);
  });

  it('throws for a missing key (signals a needed recapture)', async () => {
    const g = await goldenBrowser('golden-browser-self');
    expect(() => g.expected('missing')).toThrow(/missing key/);
  });
});
