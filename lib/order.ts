/** Code-unit order. Stable on every machine. Do not sort with a bare localeCompare. */
export function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
