/**
 * Port of frozen getRotateFix. The Safari need3dFix nudge (+0.001 on 90° multiples) is
 * intentionally omitted (no browser detection in the kit; identity matches frozen in non-Safari/test envs).
 */
export function getRotateFix(): (v: number) => number {
  return (v) => v;
}
