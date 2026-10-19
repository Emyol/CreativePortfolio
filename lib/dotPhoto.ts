/**
 * The maths behind the About photo as a dot-matrix screen (components/tracks/DotPhoto.tsx):
 * each dot is the same size, lit at one of a few brightness steps, like the player's
 * lettering.
 */

/** Brightness steps above off: a dot is off (0) or lit at 1 to STEPS. */
export const STEPS = 4;
/** Rows the scanline's soft edge spans as it lights the screen. */
const BAND = 8;

/** How the photo is turned into dots, set in the admin (about.dots): dots across the screen, and a brightness and contrast applied after the stretch. */
export type DotSettings = { across: number; brightness: number; contrast: number };
/** What the screen uses until the owner adjusts it. */
export const DOTS: DotSettings = { across: 40, brightness: 0, contrast: 1 };
/** The admin's ranges, which the content schema enforces. */
export const DOT_RANGES = {
  across: { min: 24, max: 64, step: 1 },
  brightness: { min: -0.5, max: 0.5, step: 0.05 },
  contrast: { min: 0.5, max: 2, step: 0.05 },
} as const;

/** The grid for a number of dots across, in the screen's 4:5 shape. */
export function gridFor(across: number): { cols: number; rows: number } {
  return { cols: across, rows: Math.round((across * 5) / 4) };
}

/**
 * The brightness step of each pixel of an RGBA buffer. Contrast is stretched first, so any
 * photo uses every step whatever its lighting: between its 2nd and 98th percentiles, so a
 * small highlight or shadow can't take the end steps from the rest. Then the owner's
 * contrast (about the middle) and brightness. A flat photo lights nothing.
 */
export function dotLevels(rgba: Uint8ClampedArray, { brightness, contrast }: DotSettings = DOTS): Uint8Array {
  const count = rgba.length / 4;
  const lum = new Float32Array(count);
  for (let i = 0; i < count; i++) lum[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
  const sorted = lum.slice().sort();
  const at = (p: number) => {
    const x = p * (count - 1);
    const i = Math.floor(x);
    return sorted[i] + (sorted[Math.min(count - 1, i + 1)] - sorted[i]) * (x - i);
  };
  const lo = at(0.02);
  const hi = at(0.98);
  const out = new Uint8Array(count);
  if (hi - lo < 1e-3) return out;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  for (let i = 0; i < count; i++) out[i] = Math.round(clamp((clamp((lum[i] - lo) / (hi - lo)) - 0.5) * contrast + 0.5 + brightness) * STEPS);
  return out;
}

/**
 * The part of a photo the screen shows: its shape cropped from the middle of a wide photo,
 * or from the upper part of a tall one (`focus` of the spare height above), where a face
 * usually is.
 */
export function coverRect(iw: number, ih: number, aspect: number, focus = 0.3): { sx: number; sy: number; sw: number; sh: number } {
  if (iw / ih > aspect) {
    const sw = ih * aspect;
    return { sx: (iw - sw) / 2, sy: 0, sw, sh: ih };
  }
  const sh = iw / aspect;
  return { sx: 0, sy: (ih - sh) * focus, sw: iw, sh };
}

/**
 * How lit a row is (0 to 1) while the screen powers on, `reveal` going 0 to 1: a scanline
 * sweeps down and each row eases up to full as it passes.
 */
export function rowLight(row: number, rows: number, reveal: number): number {
  const front = reveal * (rows + BAND);
  const t = Math.min(1, Math.max(0, (front - row) / BAND));
  return t * t * (3 - 2 * t);
}

/**
 * Where to sample a photo from: a published upload through the image optimiser at 128 px
 * (plenty for the dots, averaged on the way down, and far lighter than the upload); fixture
 * data: URIs and admin drafts (?draft, which need the owner's cookie) as they are, as
 * components/Photo does.
 */
export function sampleSrc(src: string): string {
  if (src.startsWith("data:") || src.endsWith("?draft")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=128&q=75`;
}
