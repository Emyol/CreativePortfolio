import type * as THREE from "three";

/** The corner box in the deck state: the player's aspect, `min(34vw, 420px)` wide, 18 px in. */
export const CORNER = { share: 0.34, max: 420, gap: 18, aspect: 1.35 } as const;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * Where the desk is drawn and from where: `mode.k` blends the desk (0: the whole viewport,
 * the camera over the desk) into the deck (1: the corner box, the camera close on the
 * player). The box is measured and written as left/top/width/height, never a CSS transition.
 * Also projects the scene back onto the page, for the DOM laid over it.
 */
export function deskFraming(three: typeof THREE, el: HTMLElement, camera: THREE.PerspectiveCamera, at: { deskX: number; playerX: number }) {
  const mode = { k: 0 };

  const boxAt = (k: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(vw * CORNER.share, CORNER.max);
    const h = w / CORNER.aspect;
    return { left: lerp(0, CORNER.gap, k), top: lerp(0, vh - CORNER.gap - h, k), width: lerp(vw, w, k), height: lerp(vh, h, k) };
  };
  const applyBox = () => {
    const b = boxAt(mode.k);
    el.style.left = `${b.left}px`;
    el.style.top = `${b.top}px`;
    el.style.width = `${b.width}px`;
    el.style.height = `${b.height}px`;
  };

  /** Points the camera for this frame (`rect`, the view's box now). */
  const aim = (rect: DOMRect) => {
    const aspect = rect.width / Math.max(1, rect.height);
    if (aspect !== camera.aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    const vp = window.innerWidth / Math.max(1, window.innerHeight);
    const deskDist = (15.5 * 1.9) / Math.min(1, vp / 1.5);
    const deckDist = 15.5 / Math.min(1, aspect / CORNER.aspect);
    const k = mode.k;
    const x = lerp(at.deskX, at.playerX, k);
    const z = lerp(1.0, 0.35, k);
    const dist = lerp(deskDist, deckDist, k);
    camera.position.set(x, dist * 0.8, z + dist * 0.6);
    camera.lookAt(x, 0, z);
    camera.updateMatrixWorld();
  };

  const v = new three.Vector3();
  /** A world point on the page, in viewport px. */
  const point = (p: THREE.Vector3) => {
    const r = el.getBoundingClientRect();
    v.copy(p).project(camera);
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
  /** A box on the page (its top face only with `top`); null when off the view or behind the camera. */
  const box = (b: THREE.Box3, top = false): DOMRect | null => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const xs of [b.min.x, b.max.x])
      for (const ys of top ? [b.max.y] : [b.min.y, b.max.y])
        for (const zs of [b.min.z, b.max.z]) {
          v.set(xs, ys, zs).project(camera);
          if (v.z > 1) return null;
          const x = r.left + ((v.x + 1) / 2) * r.width;
          const y = r.top + ((1 - v.y) / 2) * r.height;
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        }
    if (x1 < r.left || x0 > r.right || y1 < r.top || y0 > r.bottom) return null;
    return new DOMRect(x0, y0, x1 - x0, y1 - y0);
  };

  window.addEventListener("resize", applyBox);
  return {
    mode,
    applyBox,
    aim,
    point,
    box,
    dispose() {
      window.removeEventListener("resize", applyBox);
      for (const p of ["left", "top", "width", "height"]) el.style.removeProperty(p);
    },
  };
}
