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

/** Below this a dot rests (the field's grey); above it, it is lit in the tint. */
const LIT_FROM = 0.04;
/** How many lit levels a frame batches into (one fill each). Half a step is beneath notice. */
export const LEVELS = 32;
/** A lit level's dot: its alpha in the tint and its radius, as one lit `b / LEVELS` would be. */
export function levelLook(b: number): { alpha: number; radius: number } {
  const lit = b / LEVELS;
  return { alpha: 0.18 + lit * 0.8, radius: 1.1 + lit * 2.2 };
}
export const REST_RADIUS = 1.1;

/** A box of opaque paper over the field (viewport px): the J-card's panels, the transport. */
export type Cover = { left: number; top: number; right: number; bottom: number };
/** A dot is left out only this far inside a cover: its largest size, and a rounded corner, stay hidden. */
export const COVER_INSET = 6;

/**
 * One frame's dots, batched: the resting ones (flat x, y pairs) and the lit ones by level
 * (`lit[b]`, b from 1 to LEVELS). Dots wholly under a cover are left out: with a tape in,
 * the J-card's paper hides most of the field, and drawing it there is the frame's cost.
 */
export type DotPlan = { dots: number; drawn: number; rest: number[]; lit: number[][] };

export function planDots(w: number, h: number, gap: number, s: DotState, covers: Cover[], into?: DotPlan): DotPlan {
  const plan = into ?? { dots: 0, drawn: 0, rest: [], lit: Array.from({ length: LEVELS + 1 }, () => []) };
  plan.dots = plan.drawn = 0;
  plan.rest.length = 0;
  for (const pts of plan.lit) pts.length = 0;
  const inner = covers.map((c) => ({ l: c.left + COVER_INSET, t: c.top + COVER_INSET, r: c.right - COVER_INSET, b: c.bottom - COVER_INSET }));
  const p = { x: 0, y: 0 };
  for (let y = gap / 2; y < h; y += gap) {
    // The covers this row crosses (most rows cross few).
    const row = inner.filter((c) => y > c.t && y < c.b);
    for (let x = gap / 2; x < w; x += gap) {
      plan.dots++;
      if (row.length && row.some((c) => x > c.l && x < c.r)) continue;
      plan.drawn++;
      p.x = x;
      p.y = y;
      const lit = dotLevel(p, s);
      if (lit > LIT_FROM) plan.lit[Math.max(1, Math.round(lit * LEVELS))].push(x, y);
      else plan.rest.push(x, y);
    }
  }
  return plan;
}

/** How many fills a plan takes to draw: one for the resting dots, one per lit level in use. */
export function fillCount(plan: DotPlan): number {
  return (plan.rest.length ? 1 : 0) + plan.lit.reduce((n, pts) => n + (pts.length ? 1 : 0), 0);
}
