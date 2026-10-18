// The 3D player's screen: live text drawn on a canvas that textures a plane over the OLED
// glass. Sized for a 1024×452 canvas (the glass's proportions).
export const SCREEN_W = 1024;
export const SCREEN_H = 452;

const ORANGE = "#FF5A1F";
const WHITE = "#F1E7E2";
const PAD = 70;
const CHAR = 0.62; // Doto's advance as a share of its size (a monospace dot-matrix face)

export type ScreenLine = { text: string; size: number; x: number; y: number; color: string };

/** Where each line goes: an orange headline, and a white second line shrunk (then cut) to fit. */
export function screenLayout(lines: string[]): ScreenLine[] {
  const [head, second] = lines;
  const out: ScreenLine[] = [];
  if (head !== undefined) out.push({ text: head, size: 150, x: PAD, y: 190, color: ORANGE });
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
 * `family` is the page's Doto (next/font gives it its own name).
 */
export function drawScreen(ctx: CanvasRenderingContext2D, lines: string[], { dim = 1, progress, family = "Doto" }: { dim?: number; progress?: number; family?: string } = {}): void {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#040405";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.globalAlpha = dim;
  ctx.textBaseline = "alphabetic";
  for (const line of screenLayout(lines)) {
    ctx.shadowColor = line.color === ORANGE ? "rgb(255 90 31 / 0.6)" : "rgb(255 255 255 / 0.25)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = line.color;
    ctx.font = `${line.color === ORANGE ? 900 : 800} ${line.size}px ${family}, monospace`;
    ctx.fillText(line.text, line.x, line.y);
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
