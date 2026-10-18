// How far the visitor has scrolled through the hero (0 at the top, 1 once it's gone), as a
// tiny external store: the hero → dock handoff writes it; the 3D hero reads it to lean back.
let progress = 0;
const listeners = new Set<() => void>();

export function getHeroScroll(): number {
  return progress;
}

export function setHeroScroll(next: number): void {
  if (next === progress) return;
  progress = next;
  listeners.forEach((l) => l());
}

export function subscribeHeroScroll(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
