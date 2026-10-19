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

/**
 * The label's font size: the plate's (times `scale`: phones print larger, as the whole
 * player is smaller there), shrunk for a long label so it fits under its own key.
 */
export function labelSize(text: string, scale = 1): number {
  return Math.max(MIN, Math.min(Math.round(SIZE * scale), Math.floor(LABEL_FIT / Math.max(1, text.length * CHAR))));
}

/** Draws a label centred, in white: the material colours it with the device's ink. */
function drawLabel(ctx: CanvasRenderingContext2D, text: string, family: string, scale: number): void {
  ctx.clearRect(0, 0, LABEL_W, LABEL_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${labelSize(text, scale)}px ${family}, monospace`;
  ctx.fillText(text, LABEL_W / 2, LABEL_H / 2);
}

/**
 * Lays a printed label under each of `keys` on the plate of `root` (the device's model,
 * untransformed when this is called), where the model's own side-A prints are (`prints`,
 * one per key). Returns `set(labels)` to print new text (an empty string leaves a key
 * blank) and `dispose`.
 */
export function addKeyLabels(three: typeof THREE, root: THREE.Object3D, keys: THREE.Object3D[], prints: THREE.Object3D[], family: string, scale = 1) {
  root.updateMatrixWorld(true);
  const box = new three.Box3();
  const geometry = new three.PlaneGeometry(PLANE_W, PLANE_H);
  const labels = keys.map((key, i) => {
    const canvas = Object.assign(document.createElement("canvas"), { width: LABEL_W, height: LABEL_H });
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2D canvas");
    const tex = new three.CanvasTexture(canvas);
    tex.colorSpace = three.SRGBColorSpace;
    tex.anisotropy = 8;
    const material = new three.MeshStandardMaterial({
      color: "#16171A",
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
    /** The printed labels' planes, one per key. */
    meshes: labels.map((l) => l.mesh),
    set(texts: string[]) {
      labels.forEach((l, i) => {
        const text = texts[i] ?? "";
        if (text === l.text) return;
        l.text = text;
        drawLabel(l.ctx, text, family, scale);
        l.tex.needsUpdate = true;
      });
    },
    dispose() {
      geometry.dispose();
      labels.forEach((l) => (l.tex.dispose(), l.material.dispose()));
    },
  };
}
