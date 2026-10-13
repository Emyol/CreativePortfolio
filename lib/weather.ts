import type { WeatherKind } from "./seasons";

export type Particle = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; life: number };

export const GUST_MS = 2600;
export const GUST_COUNT = 36;
const FADE_IN = 300;
const FADE_OUT = 700;

/** Vertical drift range in px/ms per kind: lanterns float up, snow drifts down slowly. */
const DRIFT: Record<WeatherKind, [number, number]> = {
  petal: [0.02, 0.09], lantern: [-0.06, -0.02], maple: [0.04, 0.12],
  ginkgo: [0.04, 0.11], snow: [0.03, 0.07], plum: [0.02, 0.08],
};

export function spawnGust(kind: WeatherKind, count: number, w: number, h: number, rand: () => number = Math.random): Particle[] {
  const [lo, hi] = DRIFT[kind];
  return Array.from({ length: count }, () => ({
    x: -40 - rand() * w * 0.5,
    y: (kind === "lantern" ? 0.35 : 0) * h + rand() * h * 0.65,
    vx: 0.45 + rand() * 0.4,
    vy: lo + rand() * (hi - lo),
    rot: rand() * Math.PI * 2,
    vr: (rand() - 0.5) * 0.006,
    size: 6 + rand() * 8,
    life: 0,
  }));
}

export function stepParticles(ps: Particle[], dt: number): Particle[] {
  return ps.map((p) => ({
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt + Math.sin((p.life + dt) / 240) * 0.3,
    rot: p.rot + p.vr * dt,
    life: p.life + dt,
  }));
}

export function gustAlpha(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= GUST_MS) return 0;
  if (elapsed < FADE_IN) return elapsed / FADE_IN;
  if (elapsed > GUST_MS - FADE_OUT) return (GUST_MS - elapsed) / FADE_OUT;
  return 1;
}

export function gustDone(elapsed: number): boolean {
  return elapsed >= GUST_MS;
}
