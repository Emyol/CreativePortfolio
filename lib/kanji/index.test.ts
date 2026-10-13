import { expect, test } from "vitest";
import { getStrokes, KANJI_CHARS } from "./index";

// Stroke counts from standard references; KanjiVG must agree.
const COUNTS: Record<string, number> = { 私: 7, 祭: 11, 音: 9, 趣: 15, 棚: 12, 縁: 15, 終: 11, ミ: 3, エ: 3, ル: 2 };

test.each(Object.entries(COUNTS))("%s has %i strokes", (ch, n) => {
  expect(getStrokes(ch)).toHaveLength(n);
});

test("every path is SVG path data starting with a moveto", () => {
  for (const ch of KANJI_CHARS) for (const d of getStrokes(ch)) expect(d).toMatch(/^[Mm]/);
});

test("unknown characters fail loudly", () => {
  expect(() => getStrokes("猫")).toThrow(/fetch-kanjivg/);
});
