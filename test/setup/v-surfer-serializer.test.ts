import { describe, it, expect } from 'vitest';
import { normalizeVSurferHtml } from './v-surfer-serializer';

describe('normalizeVSurferHtml', () => {
  it('normalizes transform and transition-duration', () => {
    const input =
      '<div class="v-surfer-wrapper" style="transform: translate3d(-123px, 0px, 0px); transition-duration: 300ms;"></div>';
    const out = normalizeVSurferHtml(input);
    expect(out).toContain('transform: <normalized>');
    expect(out).toContain('transition-duration: <normalized>');
    expect(out).not.toContain('123px');
    expect(out).not.toContain('300ms');
  });

  it('strips computed px sizes and surfer CSS vars', () => {
    const input = '<div class="v-surfer-slide" style="width: 200px; --v-surfer-theme: 5px;"></div>';
    const out = normalizeVSurferHtml(input);
    expect(out).not.toContain('200px');
    expect(out).not.toContain('--v-surfer-theme');
  });

  it('does not corrupt compound property names (regression: #1)', () => {
    // min-width, max-height, line-height, border-width must NOT be stripped
    const input =
      '<div style="min-width: 120px; max-height: 300px; line-height: 1.5; border-width: 2px; width: 200px; height: 100px;"></div>';
    const out = normalizeVSurferHtml(input);
    expect(out).toContain('min-width: 120px');
    expect(out).toContain('max-height: 300px');
    expect(out).toContain('line-height: 1.5');
    expect(out).toContain('border-width: 2px');
    // bare width and height px values ARE stripped
    expect(out).not.toMatch(/\bwidth:\s*200px/);
    expect(out).not.toMatch(/\bheight:\s*100px/);
  });

  it('does not consume past a tag boundary when normalizing transform (regression: #2)', () => {
    // transform: in an element's style must not swallow closing tag or text in the next element
    const input =
      '<div style="transform: translate3d(0px, 0px, 0px);">hello</div><span>world</span>';
    const out = normalizeVSurferHtml(input);
    expect(out).toContain('transform: <normalized>');
    expect(out).toContain('hello');
    expect(out).toContain('</div>');
    expect(out).toContain('<span>world</span>');
  });

  it('normalizes the random v-surfer-wrapper id so snapshots are deterministic (regression: #3)', () => {
    const a = normalizeVSurferHtml(
      '<div class="v-surfer-wrapper" id="v-surfer-wrapper-ad688310cc1b6cb3e"></div>',
    );
    const b = normalizeVSurferHtml(
      '<div class="v-surfer-wrapper" id="v-surfer-wrapper-f7222bdeff1b7fe10"></div>',
    );
    expect(a).toBe(b);
    expect(a).toContain('v-surfer-wrapper-<id>');
    expect(a).not.toContain('ad688310');
  });
});
