import type { BreakpointParams, GroupedParamsInput } from './types';

/**
 * DOM-free port of `src/core/breakpoints/getBreakpoint.ts`. Maps each breakpoint
 * key to a numeric value (`@r` → `height * r`; else the px number), sorts ascending,
 * and returns the largest key whose value is `<= width` (≡ `matchMedia('(min-width:
 * value)')` for a window base, ≡ `value <= clientWidth` for a container base).
 * Falls back to `'max'` when none match; returns `undefined` when there are no
 * breakpoints. `@ratio` keys are skipped when no `height` is supplied.
 */
export function resolveBreakpoint(
  breakpoints: Record<string, BreakpointParams> | undefined,
  dims: { width: number; height?: number },
): string | undefined {
  if (!breakpoints || Object.keys(breakpoints).length === 0) return undefined;
  const { width, height } = dims;
  const points: { value: number; point: string }[] = [];
  for (const point of Object.keys(breakpoints)) {
    if (point.charAt(0) === '@') {
      if (height === undefined) continue; // ratio keys need a height to resolve
      points.push({ value: height * parseFloat(point.substring(1)), point });
    } else {
      points.push({ value: parseFloat(point), point });
    }
  }
  // Match the frozen comparator: parseInt difference of the (numeric) values.
  points.sort((a, b) => parseInt(String(a.value), 10) - parseInt(String(b.value), 10));
  let breakpoint: string | false = false;
  for (const { value, point } of points) {
    if (value <= width) breakpoint = point;
  }
  return breakpoint || 'max';
}

/**
 * Layer a breakpoint's overrides over a fresh base. A breakpoint may not change
 * `loop`/`direction` this slice, so those base values are restored even if the
 * breakpoint carries them.
 */
export function mergeBreakpointParams(
  base: GroupedParamsInput,
  bp: BreakpointParams | undefined,
): GroupedParamsInput {
  if (!bp) return { ...base };
  const merged: GroupedParamsInput = { ...base, ...bp };
  merged.loop = base.loop;
  merged.direction = base.direction;
  return merged;
}
