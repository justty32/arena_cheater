/** HP and damage copy share hundredth precision without trailing zeroes. */
export function formatHp(value: number): string {
  return String(Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100));
}
