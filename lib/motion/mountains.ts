import { mulberry32 } from "@/lib/random";

/** A closed silhouette of soft peaks, for layered ink mountains. */
export function mountainPath(seed: number, width: number, height: number, peaks: number): string {
  const rand = mulberry32(seed);
  const step = width / peaks;
  const clamp = (y: number) => Math.min(height, Math.max(0, y));
  let d = `M0 ${height}`;
  for (let i = 0; i <= peaks; i++) {
    const x = i * step;
    const y = clamp(height * (0.3 + rand() * 0.45));
    if (i === 0) d += ` L0 ${y.toFixed(1)}`;
    else d += ` Q${(x - step / 2).toFixed(1)} ${clamp(y - height * 0.3 * rand()).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${width} ${height} Z`;
}
