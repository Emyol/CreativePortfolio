/**
 * A line too long for the device's screen comes round like a car stereo's: it rests, then
 * scrolls left a dot column at a time until it comes round to the start again, a few passes,
 * then rests cut short with an ellipsis. Bounded, so the dock doesn't keep moving in the
 * corner of the eye for the whole song; new text plays it again. Shared by the HTML screen
 * and the 3D one.
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
  passes: 3,
};

/** How long one pass takes, in ms, for a line that moves `shift` px at `size` px type. */
export const marqueePass = (shift: number, size: number) => MARQUEE.rest + (shift / (size * MARQUEE.speed)) * 1000;

/** How far a marquee has moved `ms` into it, in px (whole dot columns), or null once its passes are done. */
export function marqueeAt(ms: number, shift: number, size: number): number | null {
  const pass = marqueePass(shift, size);
  if (ms >= pass * MARQUEE.passes) return null;
  const t = ms % pass;
  if (t <= MARQUEE.rest) return 0;
  const dot = MARQUEE.dot * size;
  return Math.min(shift, Math.round((((t - MARQUEE.rest) / (pass - MARQUEE.rest)) * shift) / dot) * dot);
}
