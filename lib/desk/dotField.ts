export type Rgb = [number, number, number];

export const GAP = { full: 14, lite: 12 } as const;
export const BASE_ALPHA = { day: 0.16, night: 0.07 } as const;
const LIT_RADIUS = { day: 150, night: 230 } as const;
const RIPPLE = { speed: 900, life: 2.2, width: 70 } as const;

export type DotState = {
  pointer: { x: number; y: number } | null;
  ripple: { x: number; y: number; age: number } | null;
  playing: boolean;
  night: boolean;
  t: number;
  still: boolean;
};

/** How lit one dot is, 0 to 1: near the pointer, on the ripple ring, and a faint wave while playing. */
export function dotLevel(p: { x: number; y: number }, s: DotState): number {
  const near = s.pointer
    ? Math.max(0, 1 - Math.hypot(p.x - s.pointer.x, p.y - s.pointer.y) / (s.night ? LIT_RADIUS.night : LIT_RADIUS.day))
    : 0;
  let ring = 0;
  if (s.ripple && !s.still) {
    const d = Math.hypot(p.x - s.ripple.x, p.y - s.ripple.y);
    ring =
      Math.max(0, 1 - Math.abs(d - s.ripple.age * RIPPLE.speed) / RIPPLE.width) *
      Math.max(0, 1 - s.ripple.age / RIPPLE.life);
  }
  const wave = s.playing && !s.still ? 0.5 + 0.5 * Math.sin(p.x * 0.02 - s.t * 2 + Math.sin(p.y * 0.01 + s.t)) : 0;
  return Math.min(1, near + ring + wave * 0.18);
}

/** One easing step of the tint from `from` towards `to`. */
export function mixTint(from: Rgb, to: Rgb, k: number): Rgb {
  return [0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * k) as Rgb;
}

export const RIPPLE_LIFE = RIPPLE.life;
