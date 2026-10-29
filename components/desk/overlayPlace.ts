import type { ProjectId } from "./deskScene";

/** Where the 3D draws something on the page, or null when it is off the view. */
export type Project = (id: ProjectId) => DOMRect | null;

/** What the desk calls on every 3D frame to move an overlay's links onto the 3D. */
export type OverlayHandle = { place(): void };

/** The smallest hit box a link gets, however small its tape or key is drawn. */
export const MIN_HIT = 44;

const last = new WeakMap<HTMLElement, string>();

/**
 * Moves one link's box onto `r` (viewport px) with a transform, grown to at least 44 × 44
 * around its centre; off the view (`r` null), the box hides and leaves the tab order.
 * Writes only what changed, since it runs on every frame.
 */
export function placeBox(el: HTMLElement, r: DOMRect | null) {
  if (!r) {
    if (el.dataset.off === undefined) el.dataset.off = "";
    return;
  }
  if (el.dataset.off !== undefined) delete el.dataset.off;
  const w = Math.max(MIN_HIT, r.width);
  const h = Math.max(MIN_HIT, r.height);
  const x = Math.round(r.x + r.width / 2 - w / 2);
  const y = Math.round(r.y + r.height / 2 - h / 2);
  const key = `${x} ${y} ${Math.round(w)} ${Math.round(h)}`;
  if (last.get(el) === key) return;
  last.set(el, key);
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  el.style.width = `${Math.round(w)}px`;
  el.style.height = `${Math.round(h)}px`;
}

/** Places every `[data-box]` in `layer` with its own id; the layer then lays them out fixed. */
export function placeAll(layer: HTMLElement, project: Project, id: (el: HTMLElement) => ProjectId) {
  if (layer.dataset.placed === undefined) layer.dataset.placed = "";
  layer.querySelectorAll<HTMLElement>("[data-box]").forEach((el) => placeBox(el, project(id(el))));
}

/** Back to the CSS layout (the sprite desk's positions): the 3D has gone. */
export function unplaceAll(layer: HTMLElement) {
  delete layer.dataset.placed;
  layer.querySelectorAll<HTMLElement>("[data-box]").forEach((el) => {
    last.delete(el);
    delete el.dataset.off;
    for (const p of ["transform", "width", "height"]) el.style.removeProperty(p);
  });
}
