/**
 * A line too long for the device's screen comes round like a car stereo's: it rests, then
 * scrolls left a dot column at a time until it comes round to the start again, and again,
 * for as long as it is on the screen (the owner's choice, for the whole song). Under reduced
 * motion it rests instead: a line a little too long is set smaller to fit, whole (`fitScale`);
 * only one that would go below FIT_FLOOR is cut short with an ellipsis, its full text kept
 * where assistive tech reads it. Shared by the HTML screen and the 3D one.
 */
export const MARQUEE = {
  /** How long it rests at the start of each pass, in ms. */
  rest: 1500,
  /** How fast it scrolls, in its own font size a second. */
  speed: 3,
  /** The space before it comes round again, in its own font size. */
  gap: 2,
  /** How far it steps at a time (about one of Doto's dot columns), in its own font size. */
  dot: 0.1,
};

/** How long one pass takes, in ms, for a line that moves `shift` px at `size` px type. */
export const marqueePass = (shift: number, size: number) => MARQUEE.rest + (shift / (size * MARQUEE.speed)) * 1000;

/** How far a marquee has moved `ms` into it, in px (whole dot columns). */
export function marqueeAt(ms: number, shift: number, size: number): number {
  const pass = marqueePass(shift, size);
  const t = ms % pass;
  if (t <= MARQUEE.rest) return 0;
  const dot = MARQUEE.dot * size;
  return Math.min(shift, Math.round((((t - MARQUEE.rest) / (pass - MARQUEE.rest)) * shift) / dot) * dot);
}

/** The smallest share of its own size a still line is set at to fit; any longer, it is cut. */
export const FIT_FLOOR = 0.8;

/**
 * The scale a still line `width` wide takes to fit `room` (both in the same units): 1 when it
 * fits, under 1 (rounded down to a hundredth, so it surely fits) when a little too long, null
 * when that would go below FIT_FLOOR.
 */
export function fitScale(width: number, room: number): number | null {
  if (width <= room) return 1;
  const k = Math.floor((room / width) * 100) / 100;
  return k >= FIT_FLOOR ? k : null;
}
