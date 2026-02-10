export function similarity(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let m = 0;
  for (const ch of a) if (b.includes(ch)) m++;
  return m / Math.max(a.length, b.length);
}