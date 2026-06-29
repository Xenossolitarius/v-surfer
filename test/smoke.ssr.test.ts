import { describe, it, expect } from 'vitest';

describe('smoke (ssr)', () => {
  it('runs in node (no DOM)', () => {
    expect(typeof window).toBe('undefined');
  });
});
