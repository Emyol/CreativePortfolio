// The 3D player's screen: live text drawn on a canvas that textures a plane over the OLED
// glass. Sized for a 1024×452 canvas (the glass's proportions).
import { MARQUEE } from "@/lib/motion/marquee";

export const SCREEN_W = 1024;
export const SCREEN_H = 452;

const ORANGE = "#FF5A1F";
const WHITE = "#F1E7E2";
const PAD = 70;
const CHAR = 0.62; // Doto's advance as a share of its size (a monospace dot-matrix face)
/** The headline's type size; it comes round (lib/motion/marquee.ts) when too long. */
export const HEAD_SIZE = 150;
const ROOM = SCREEN_W - 2 * PAD;

/** `scroll`: how far a headline coming round has moved; `shift`, how far apart its two copies are. */
export type ScreenLine = { text: string; size: number; x: number; y: number; color: string; scroll?: number; shift?: number };

/** How wide the headline draws, in canvas px. */
export type Measure = (text: string) => number;
const HEAD_FONT = (family: string) => `900 ${HEAD_SIZE}px ${family}, monospace`;
/** Doto's advance for every character: what the layout assumes with no canvas to measure on. */
const estimate: Measure = (text) => Array.from(text).length * HEAD_SIZE * CHAR;
/** The headline's real width on `ctx` (a title in a script Doto lacks falls back wider). */
export const measureHead = (ctx: CanvasRenderingContext2D, family: string): Measure => (text) => {
  ctx.font = HEAD_FONT(family);
  return ctx.measureText(text).width;
};

/** How far a headline too long for the screen moves to come round once, in canvas px; 0 when it fits. */
export function headlineShift(lines: string[], measure: Measure = estimate): number {
  const width = lines[0] ? measure(lines[0]) : 0;
  return width > ROOM ? width + MARQUEE.gap * HEAD_SIZE : 0;
}

/**
 * Where each line goes: an orange headline, and a white second line shrunk (then cut) to fit.
 * A headline too long comes round instead (`scroll` says how far it has), or rests cut short.
 * (The HTML screen lets a long second line come round too; this one has room to shrink it.)
 */
export function screenLayout(lines: string[], scroll?: number, measure: Measure = estimate): ScreenLine[] {
  const [head, second] = lines;
  const out: ScreenLine[] = [];
  if (head !== undefined) {
    const shift = headlineShift(lines, measure);
    let text = head;
    if (shift && scroll === undefined) {
      // Whole characters (an emoji is one) off the end until it fits with its ellipsis.
      const chars = Array.from(head);
      do chars.pop();
      while (chars.length && measure(`${chars.join("")}…`) > ROOM);
      text = `${chars.join("")}…`;
    }
    out.push({ text, size: HEAD_SIZE, x: PAD, y: 190, color: ORANGE, ...(shift && scroll !== undefined ? { scroll, shift } : {}) });
  }
  if (second) {
    const room = SCREEN_W - 2 * PAD - 8;
    const size = Math.max(48, Math.min(92, Math.floor(room / (second.length * CHAR))));
    const fits = Math.floor(room / (size * CHAR));
    const text = second.length > fits ? `${second.slice(0, fits - 1)}…` : second;
    out.push({ text, size, x: PAD + 4, y: 330, color: WHITE });
  }
  return out;
}

/**
 * Draws the screen: lines at `dim` brightness (the flicker), and the playhead when playing.
 * `family` is the page's Doto (next/font gives it its own name); `scroll`, how far a long
 * headline has come round (screenLayout).
 */
export function drawScreen(ctx: CanvasRenderingContext2D, lines: string[], { dim = 1, progress, family = "Doto", scroll }: { dim?: number; progress?: number; family?: string; scroll?: number } = {}): void {
  const layout = screenLayout(lines, scroll, measureHead(ctx, family));
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#040405";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = dim;
  ctx.textBaseline = "alphabetic";
  for (const line of layout) {
    ctx.shadowColor = line.color === ORANGE ? "rgb(255 90 31 / 0.6)" : "rgb(255 255 255 / 0.25)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = line.color;
    ctx.font = line.color === ORANGE ? HEAD_FONT(family) : `800 ${line.size}px ${family}, monospace`;
    if (line.scroll === undefined || line.shift === undefined) {
      ctx.fillText(line.text, line.x, line.y);
      continue;
    }
    // Coming round: the text and a copy a gap behind it, lit only between the playhead's
    // ends (and the glow just past them).
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD - 24, 0, ROOM + 48, SCREEN_H);
    ctx.clip();
    ctx.fillText(line.text, line.x - line.scroll, line.y);
    ctx.fillText(line.text, line.x - line.scroll + line.shift, line.y);
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  if (progress !== undefined) {
    ctx.fillStyle = "rgb(241 231 226 / 0.35)";
    ctx.fillRect(PAD, 384, SCREEN_W - 2 * PAD, 8);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(PAD, 384, (SCREEN_W - 2 * PAD) * Math.min(1, Math.max(0, progress)), 8);
  }
  ctx.globalAlpha = 1;
}
