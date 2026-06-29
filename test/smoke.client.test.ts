import { describe, it, expect } from 'vitest';

describe('smoke (client)', () => {
  it('runs in jsdom', () => {
    expect(typeof window).toBe('object');
    expect(typeof document.createElement('div')).toBe('object');
  });
});
