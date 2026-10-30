import type * as THREE from "three";

// Each key's label is printed on the plate below it: a canvas texture on a plane laid on the
// aluminium, so it tilts and foreshortens with the player (the page's own labels stay for
// screen readers, unseen). Sized for a 512×96 canvas over a 1.6×0.3 plane.
export const LABEL_W = 512;
export const LABEL_H = 96;
export const PLANE_W = 1.6; // model units
export const PLANE_H = 0.3;
/** The width a label may take, px of its canvas: about its key's spacing, so neighbours never touch. */
export const LABEL_FIT = 420;
const SIZE = 54; // px: Space Mono at the plate's printed size (device.py: 0.15 units)
const MIN = 30;
const CHAR = 0.6; // Space Mono's advance as a share of its size

/** The share of the keys' pitch a label may take, so neighbours keep a clear gap. */
export const PITCH_SHARE = 0.8;

/** The canvas px a label may take on a plate whose keys stand `pitch` model units apart. */
export const pitchFit = (pitch: number): number => Math.floor(((pitch * PITCH_SHARE) / PLANE_W) * LABEL_W);

/**
 * The label's font size: the plate's, shrunk for a long label so it fits under its own key.
 * A phone (`scale` > 1) prints larger, as the whole player is smaller there, but only as far
 * as the keys' pitch leaves room (`fit`, canvas px: pitchFit), and never smaller than the
 * desk's own print.
 */
export function labelSize(text: string, scale = 1, fit = LABEL_FIT): number {
  const advance = Math.max(1, text.length * CHAR);
  const desk = Math.max(MIN, Math.min(SIZE, Math.floor(LABEL_FIT / advance)));
  if (scale <= 1) return desk;
  return Math.max(desk, Math.min(Math.round(SIZE * scale), Math.floor(Math.min(fit, LABEL_FIT) / advance)));
}

/** Draws a label centred, in white: the material colours it with the device's ink. */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, family: string, scale: number, fit: number): void {
  ctx.clearRect(0, 0, LABEL_W, LABEL_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${labelSize(text, scale, fit)}px ${family}, monospace`;
  ctx.fillText(text, LABEL_W / 2, LABEL_H / 2);
}

/**
 * The print's night ink: at night the plate falls dark under the lamp, so the labels light
 * up like a luminous legend (the material's emissive, 0 by day), a pale warm white.
 */
export const LEGEND = "#F4EFE6";

/**
 * Lays a printed label under each of `keys` on the plate of `root` (the device's model,
 * untransformed when this is called), where the model's own side-A prints are (`prints`,
 * one per key). Returns `set(labels)` to print new text (an empty string leaves a key
 * blank), the labels' `materials` (their emissive lights the legend, see LEGEND) and
 * `dispose`.
 */
export function addKeyLabels(three: typeof THREE, root: THREE.Object3D, keys: THREE.Object3D[], prints: THREE.Object3D[], family: string, scale = 1) {
  root.updateMatrixWorld(true);
  const box = new three.Box3();
  const geometry = new three.PlaneGeometry(PLANE_W, PLANE_H);
  // How far apart the keys stand: a label never takes more than its share of that.
  const centres = keys.map((key) => box.setFromObject(key).getCenter(new three.Vector3()).x);
  const across = [...centres].sort((a, b) => a - b);
  const pitch = Math.min(...across.slice(1).map((x, i) => x - across[i]));
  const fit = pitchFit(pitch);
  const labels = keys.map((key, i) => {
    const canvas = Object.assign(document.createElement("canvas"), { width: LABEL_W, height: LABEL_H });
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2D canvas");
    const tex = new three.CanvasTexture(canvas);
    tex.colorSpace = three.SRGBColorSpace;
    tex.anisotropy = 8;
    const material = new three.MeshStandardMaterial({
      color: "#16171A",
      emissive: LEGEND,
      emissiveIntensity: 0,
      map: tex,
      transparent: true,
      depthWrite: false,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const mesh = new three.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    const x = box.setFromObject(key).getCenter(new three.Vector3()).x; // centred under its key
    box.setFromObject(prints[i]);
    mesh.position.set(x, box.max.y + 0.002, (box.min.z + box.max.z) / 2);
    root.add(mesh);
    return { ctx, tex, material, mesh, text: null as string | null };
  });
  return {
    /**
     * For tests: each label's centre across the plate and its printed width, in model units
     * (as drawn, measured on its canvas), in the keys' order.
     */
    measure() {
      return {
        centres,
        widths: labels.map((l) => {
          l.ctx.font = `400 ${labelSize(l.text ?? "", scale, fit)}px ${family}, monospace`;
          return (l.ctx.measureText(l.text ?? "").width / LABEL_W) * PLANE_W;
        }),
      };
    },
    /** The printed labels' planes, one per key. */
    meshes: labels.map((l) => l.mesh),
    materials: labels.map((l) => l.material),
    /**
     * For measuring the print as lit: key `i`'s whole label painted in its ink (`print`) or
     * left bare to the plate (`ground`); null prints its text again.
     */
    swatch(i: number, mode: "print" | "ground" | null) {
      const l = labels[i];
      if (!l) return;
      if (mode === null) drawLabel(l.ctx, l.text ?? "", family, scale, fit);
      else {
        l.ctx.clearRect(0, 0, LABEL_W, LABEL_H);
        if (mode === "print") {
          l.ctx.fillStyle = "#fff";
          l.ctx.fillRect(0, 0, LABEL_W, LABEL_H);
        }
      }
      l.tex.needsUpdate = true;
    },
    set(texts: string[]) {
      labels.forEach((l, i) => {
        const text = texts[i] ?? "";
        if (text === l.text) return;
        l.text = text;
        drawLabel(l.ctx, text, family, scale, fit);
        l.tex.needsUpdate = true;
      });
    },
    dispose() {
      geometry.dispose();
      labels.forEach((l) => (l.tex.dispose(), l.material.dispose()));
    },
  };
}
