import data from "./strokes.json";

const STROKES = data as Record<string, string[]>;
export const KANJI_CHARS: readonly string[] = Object.keys(STROKES);

export function getStrokes(char: string): readonly string[] {
  const s = STROKES[char];
  if (!s) throw new Error(`No KanjiVG strokes for "${char}". Add it to scripts/fetch-kanjivg.mjs and run npm run kanji:fetch.`);
  return s;
}
