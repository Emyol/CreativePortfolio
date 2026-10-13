// Downloads KanjiVG stroke paths for the characters the site writes.
// KanjiVG (c) Ulrich Apel, CC BY-SA 3.0, http://kanjivg.tagaini.net
import { writeFileSync } from "node:fs";

const CHARS = ["私", "祭", "音", "趣", "棚", "縁", "終", "ミ", "エ", "ル"];
const BASE = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/";

const out = {};
for (const ch of CHARS) {
  const code = ch.codePointAt(0).toString(16).padStart(5, "0");
  const res = await fetch(`${BASE}${code}.svg`);
  if (!res.ok) throw new Error(`KanjiVG ${code}: HTTP ${res.status}`);
  const svg = await res.text();
  const strokes = [...svg.matchAll(/<path\s+id="kvg:[0-9a-f]+-s(\d+)"[^>]*?\sd="([^"]+)"/g)]
    .map((m) => ({ n: Number(m[1]), d: m[2] }))
    .sort((a, b) => a.n - b.n)
    .map((s) => s.d);
  if (strokes.length === 0) throw new Error(`No strokes parsed for ${code}`);
  out[ch] = strokes;
  console.log(`${code} ${strokes.length} strokes`);
}
writeFileSync(new URL("../lib/kanji/strokes.json", import.meta.url), JSON.stringify(out, null, 1) + "\n", "utf8");
