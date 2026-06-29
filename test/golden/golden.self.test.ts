import { describe, it, expect } from 'vitest';
import { golden } from './golden';

// In normal mode the helper reads committed fixtures; this self-test exercises the
// replay path against a checked-in fixture (test/golden/__fixtures__/self.json => {"a": 7}).
describe('golden helper (replay mode)', () => {
  it('returns the stored value for a known key', () => {
    const g = golden('self');
    expect(g.expected('a')).toBe(7);
  });

  it('throws for a missing key (signals a needed recapture)', () => {
    const g = golden('self');
    expect(() => g.expected('missing')).toThrow(/missing key/);
  });
});
