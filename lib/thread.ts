export type Point = { x: number; y: number };

const r = (n: number) => Math.round(n * 10) / 10;

/** A soft red thread through each knot in order. */
export function threadPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const k = (b.y - a.y) * 0.5;
    d += ` C${r(a.x)} ${r(a.y + k)} ${r(b.x)} ${r(b.y - k)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}
