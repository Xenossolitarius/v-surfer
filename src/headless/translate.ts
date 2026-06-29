/** Port of `src/core/translate/minTranslate.ts` / `maxTranslate.ts` (no DOM). */
export function minTranslate(snapGrid: number[]): number {
  return snapGrid[0] === 0 ? 0 : -snapGrid[0];
}

export function maxTranslate(snapGrid: number[]): number {
  return -snapGrid[snapGrid.length - 1];
}
