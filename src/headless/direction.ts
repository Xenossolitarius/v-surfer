/** Layout/drag axis (vertical uses Y for measurement, drag, render) plus the RTL-axis predicate. */
export type Direction = 'horizontal' | 'vertical';

/**
 * Mirror of the frozen core's `rtlTranslate` flag (src/core/core.ts:526,582):
 * RTL only mirrors the *horizontal* axis. On a vertical slider `dir="rtl"` is
 * cosmetic — it still toggles the `v-surfer-rtl` class, but translate, drag-diff,
 * and momentum stay canonical. The engine's three sign-flip edges gate on this,
 * never on the raw `rtl` param.
 */
export function rtlTranslate(rtl: boolean, direction: Direction): boolean {
  return rtl && direction === 'horizontal';
}

/** The primary-axis coordinate of a point for this direction (y when vertical, else x). */
export function axisCoord(sample: { x: number; y: number }, direction: Direction): number {
  return direction === 'vertical' ? sample.y : sample.x;
}

/** Map a scalar wrapper translate onto the rendered transform axes. */
export function renderTransform(translate: number, direction: Direction): { x: number; y: number } {
  return direction === 'vertical' ? { x: 0, y: translate } : { x: translate, y: 0 };
}
