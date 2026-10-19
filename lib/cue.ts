// The song the visitor is hovering in the mixtape, as a tiny external store: the row
// writes it, the hero and dock screens read it ("CUE <title>").
let cue: string | null = null;
const listeners = new Set<() => void>();

export function getCue(): string | null {
  return cue;
}

export const getServerCue = (): string | null => null;

export function setCue(next: string | null): void {
  if (next === cue) return;
  cue = next;
  listeners.forEach((l) => l());
}

export function subscribeCue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
