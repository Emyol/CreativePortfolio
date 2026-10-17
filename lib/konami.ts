export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"] as const;

/** Advances the match. Only "Up Up" overlaps itself, so a mismatched Up restarts at 1, or stays at 2 after Up Up. */
export function konamiStep(progress: number, key: string): number {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === KONAMI[progress]) return progress + 1;
  if (k === "ArrowUp") return progress === 2 ? 2 : 1;
  return 0;
}
