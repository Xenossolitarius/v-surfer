/** Normalize layout-dependent / volatile bits so DOM snapshots are deterministic in jsdom. */
export function normalizeVSurferHtml(html: string): string {
  return (
    html
      // Surfer assigns a random id (e.g. v-surfer-wrapper-ad688310cc1b6cb3e) to the
      // wrapper and references it from aria attributes — normalize so snapshots are
      // stable across runs.
      .replace(/v-surfer-wrapper-[0-9a-f]+/gi, 'v-surfer-wrapper-<id>')
      .replace(/transform:\s*[^;"'<]+;?/g, 'transform: <normalized>;')
      .replace(/transition-duration:\s*[^;"'<]+;?/g, 'transition-duration: <normalized>;')
      .replace(/--v-surfer-[\w-]+:\s*[^;"']+;?/g, '')
      .replace(/(^|;|"|\s)(?:width|height|margin-(?:right|left|top|bottom)):\s*[\d.]+px;?/g, '$1')
      .replace(/\s+style="\s*"/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/** Vitest snapshot serializer for DOM elements. */
export const vSurferSerializer = {
  test(val: unknown): boolean {
    return typeof val === 'object' && val !== null && (val as Node).nodeType === 1;
  },
  serialize(val: unknown): string {
    return normalizeVSurferHtml((val as Element).outerHTML);
  },
};
