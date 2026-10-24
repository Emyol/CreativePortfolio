/**
 * A line too long for the device's screen comes round like a car stereo's: it rests, then
 * scrolls left until it comes round to the start again, a few passes, then rests cut short
 * with an ellipsis. Bounded, so the dock doesn't keep moving in the corner of the eye for
 * the whole song; new text plays it again. Shared by the HTML screen and the 3D one.
 */
export const MARQUEE = {
  /** How long it rests at the start of each pass, in ms. */
  rest: 1500,
  /** How fast it scrolls, in its own font size a second. */
  speed: 3,
  /** The space before it comes round again, in its own font size. */
  gap: 2,
  passes: 3,
};

/** How long one pass takes, in ms, for a line that moves `shift` px at `size` px type. */
export const marqueePass = (shift: number, size: number) => MARQUEE.rest + (shift / (size * MARQUEE.speed)) * 1000;

/** How far a marquee has moved `ms` into it, in px, or null once its passes are done. */
export function marqueeAt(ms: number, shift: number, size: number): number | null {
  const pass = marqueePass(shift, size);
  if (ms >= pass * MARQUEE.passes) return null;
  const t = ms % pass;
  return t <= MARQUEE.rest ? 0 : ((t - MARQUEE.rest) / (pass - MARQUEE.rest)) * shift;
}
