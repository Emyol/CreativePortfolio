/** The screen box holding a face's projected corners (a tilted face projects to a quad). */
export function rectFromCorners(points: { x: number; y: number }[]): { left: number; top: number; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}
