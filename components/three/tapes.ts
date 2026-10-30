import type * as THREE from "three";
import type { SiteContent } from "@/lib/content/schema";
import { TRACK_INK, backLabel, tapeLabel } from "@/lib/desk/tapeLabel";
import type { Track, TrackId } from "@/lib/tape";

const LABEL_W = 1024;
const LABEL_H = 256;
const PAPER = "#EEF0F2";
const PAPER_INK = "#16181B";
/**
 * The sub-line's grey. Darker than the J-card's muted ink: printed this small, the label's
 * texture is sampled from a mip level that blurs it into the paper, and the light lifts it
 * further (by day the room's reflections, at night the lamp), so the grey that reads at
 * 4.5:1 on screen is darker than the one that would on paper.
 */
const PAPER_MUTED = "#363940";
/** The B-side label's dark print. */
export const BACK = "#1B1C20";
const BACK_RGB: Rgb = [0x1b, 0x1c, 0x20];
const BACK_TEXT = "#D4D4D8";

/**
 * The band of the front label the sub-line is printed in (px of its canvas): its 30 px type
 * at most, from x 232 on its baseline at 236. For measuring the print as drawn.
 */
export const SUB_LINE = { left: 228, right: LABEL_W - 24, top: 208, bottom: 246 } as const;
/** A point of the front label's canvas in its PrintedLabel plane's own space (a 1 × 1 plane). */
export const labelPoint = (x: number, y: number): [number, number] => [x / LABEL_W - 0.5, 0.5 - y / LABEL_H];

type Rgb = [number, number, number];
const rgb =([r, g, b]: Rgb, k = 1) => `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;

// WCAG 2.x relative luminance and contrast ratio.
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * The track's ink as printed on the dark B-side: the ink itself where it already reads at
 * 4.5:1 on BACK, otherwise lifted toward white just until it does (events' blue is too dark).
 * TRACK_INK itself stays as it is for the shell, the dot field and the J-card.
 */
export function bsideInk(ink: Rgb): Rgb {
  for (let k = 0; k <= 1; k += 0.02) {
    const lifted = ink.map((c) => Math.round(c + (255 - c) * k)) as Rgb;
    if (contrast(lifted, BACK_RGB) >= 4.5) return lifted;
  }
  return [255, 255, 255];
}

/**
 * For measuring printed text as lit, whatever its size on screen: its band painted solid in
 * its ink (`print`) or in what it is printed on (`ground`); null prints the words again.
 */
export type Swatch = "print" | "ground";

/**
 * A printed label's material. Its emissive is the label itself (0 by day): at night the
 * scene raises it a little, so a label catches some light out of the lamp's pool, paper and
 * print together (their contrast as printed), and reads in the dark room (deskScene's
 * `setNight`). `userData.printed` marks it, through the scene's copies too.
 */
function printMaterial(three: typeof THREE, map: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new three.MeshPhysicalMaterial({ map, roughness: 0.8, specularIntensity: 0.3, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0 });
  m.userData.printed = true;
  return m;
}

/** Paints a tape's front sub-line as a swatch, or as its words again (null). */
export function tapeSwatch(tape: THREE.Object3D, mode: Swatch | null): void {
  (tape.userData.swatch as ((mode: Swatch | null) => void) | undefined)?.(mode);
}

function labelTexture(three: typeof THREE, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = Object.assign(document.createElement("canvas"), { width: LABEL_W, height: LABEL_H });
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2D canvas");
  draw(g);
  const tex = new three.CanvasTexture(canvas);
  tex.colorSpace = three.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Shrinks a line's type until it fits `room` px. */
function fit(g: CanvasRenderingContext2D, text: string, weight: number, size: number, font: string, room: number) {
  let s = size;
  do g.font = `${weight} ${s}px ${font}, monospace`;
  while (g.measureText(text).width > room && (s -= 4) > 18);
}

/**
 * The desk's tapes: clones of the player's own cassette (`template`, its "Cassette" node),
 * one per visible track, the shell tinted in the track's ink, a printed label over side A and
 * a B-side label underneath listing what is really on the track. Each tape is in the
 * template's own space (no position), for the scene to place. Dispose with `disposeTapes`.
 */
export function buildTapes(three: typeof THREE, template: THREE.Object3D, tracks: Track[], content: SiteContent, font = "monospace"): Map<TrackId, THREE.Object3D> {
  template.updateMatrixWorld(true);
  const inv = template.matrixWorld.clone().invert();
  const labelMesh = template.getObjectByName("A_Label") ?? template;
  const lb = new three.Box3().setFromObject(labelMesh).applyMatrix4(inv);
  const tb = new three.Box3().setFromObject(template).applyMatrix4(inv);
  const centre = lb.getCenter(new three.Vector3());
  const size = lb.getSize(new three.Vector3());
  const plane = new three.PlaneGeometry(1, 1);
  plane.userData.tapeOwned = true;

  const tapes = new Map<TrackId, THREE.Object3D>();
  for (const track of tracks) {
    const ink = TRACK_INK[track.id];
    const tape = template.clone(true);
    tape.position.set(0, 0, 0);
    tape.quaternion.identity();
    tape.scale.set(1, 1, 1);
    tape.visible = true;
    const shell = new three.MeshPhysicalMaterial({ color: rgb(ink, 0.42), roughness: 0.38, clearcoat: 0.4 });
    const paper = new three.MeshPhysicalMaterial({ color: rgb(ink), roughness: 0.8 });
    tape.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as THREE.Material).name;
      if (name === "Shell") mesh.material = shell;
      if (name === "Label") mesh.material = paper;
    });

    const { number, title, sub } = tapeLabel(track);
    // The front label; a swatch (for measuring the print as lit) fills the sub-line's band
    // with its ink or with the paper instead of the words.
    const drawFront = (g: CanvasRenderingContext2D, swatch: Swatch | null = null) => {
      g.fillStyle = PAPER;
      g.fillRect(0, 0, LABEL_W, LABEL_H);
      g.fillStyle = rgb(ink);
      g.fillRect(0, 0, LABEL_W, 46);
      g.fillStyle = PAPER_INK;
      g.font = `700 120px ${font}, monospace`;
      g.fillText(number, 36, 190);
      fit(g, title, 700, 92, font, LABEL_W - 266);
      g.fillText(title, 230, 182);
      g.fillStyle = PAPER_MUTED;
      if (swatch) {
        const { left, right, top, bottom } = SUB_LINE;
        if (swatch === "ground") g.fillStyle = PAPER;
        g.fillRect(left, top, right - left, bottom - top);
        return;
      }
      fit(g, sub, 700, 30, font, LABEL_W - 266);
      g.fillText(sub, 232, 236);
    };
    const front = labelTexture(three, drawFront);
    const back = labelTexture(three, (g) => {
      g.fillStyle = BACK;
      g.fillRect(0, 0, LABEL_W, LABEL_H);
      g.fillStyle = rgb(bsideInk(ink));
      fit(g, `${number} ${title.toUpperCase()} · B-SIDE`, 700, 46, font, LABEL_W - 72);
      g.fillText(`${number} ${title.toUpperCase()} · B-SIDE`, 36, 72);
      g.fillStyle = BACK_TEXT;
      g.font = `700 36px ${font}, monospace`;
      backLabel(track.id, content).forEach((line, k) => g.fillText(line, 36, 140 + k * 48));
    });

    // The cassette lies flat: its labels face up (side A) and down (side B).
    const printed = new three.Mesh(plane, printMaterial(three, front));
    printed.name = "PrintedLabel";
    printed.position.set(centre.x, lb.max.y + 0.002, centre.z);
    printed.rotation.x = -Math.PI / 2;
    printed.scale.set(size.x * 0.98, size.z * 0.94, 1);
    const bside = new three.Mesh(plane, printMaterial(three, back));
    bside.name = "PrintedBSide";
    bside.position.set(centre.x, tb.min.y - 0.002, centre.z);
    bside.rotation.x = Math.PI / 2;
    bside.scale.copy(printed.scale);
    tape.add(printed, bside);
    const swatch = (mode: Swatch | null) => {
      drawFront((front.image as HTMLCanvasElement).getContext("2d")!, mode);
      front.needsUpdate = true;
    };
    tape.userData = { id: track.id, owned: [shell, paper, printed.material, bside.material, front, back, plane], swatch };
    tapes.set(track.id, tape);
  }
  return tapes;
}

/** Frees what `buildTapes` made (the shared model's own materials and geometry stay). */
export function disposeTapes(tapes: Map<TrackId, THREE.Object3D>): void {
  const done = new Set<{ dispose(): void }>();
  for (const tape of tapes.values()) {
    for (const d of (tape.userData.owned ?? []) as { dispose(): void }[]) {
      if (done.has(d)) continue;
      done.add(d);
      d.dispose();
    }
    tape.removeFromParent();
  }
}
