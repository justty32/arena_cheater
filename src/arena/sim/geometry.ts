export interface Point { x: number; y: number }

/** First contact of two circles following the same normalized time interval. */
export function sweptCircleTime(a0: Point, a1: Point, b0: Point, b1: Point, radius: number): number | undefined {
  const x = a0.x - b0.x, y = a0.y - b0.y;
  const vx = a1.x - a0.x - (b1.x - b0.x);
  const vy = a1.y - a0.y - (b1.y - b0.y);
  const c = x * x + y * y - radius * radius;
  if (c <= 0) return 0;
  const a = vx * vx + vy * vy;
  if (a < 1e-12) return undefined;
  const b = 2 * (x * vx + y * vy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return undefined;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= -1e-9 && t <= 1 + 1e-9 ? Math.max(0, Math.min(1, t)) : undefined;
}
