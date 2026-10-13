import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { GLOSSARY } from "./glossary";

const ROOTS = ["app", "components", "lib"];
const SKIP = [/\.test\.tsx?$/, /fixtures\.ts$/, /strokes\.json$/, /glossary\.ts$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|json|css)$/.test(p) && !SKIP.some((r) => r.test(p)) ? [p] : [];
  });
}
const sources = ROOTS.flatMap(files).concat("lib/content/seed.json");
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/g;

describe("content rules", () => {
  test("every Japanese character in source and content is in the glossary", () => {
    const known = new Set(GLOSSARY.flatMap((g) => [...g.term]));
    const missing = sources.flatMap((f) => [...new Set(readFileSync(f, "utf8").match(CJK) ?? [])].filter((ch) => !known.has(ch)).map((ch) => `${ch} in ${f}`));
    expect(missing).toEqual([]);
  });
  test("every glossary entry has a reading and an English meaning", () => {
    for (const g of GLOSSARY) {
      expect(g.reading.trim(), g.term).not.toBe("");
      expect(g.meaning.trim(), g.term).not.toBe("");
    }
  });
  test("no phone numbers anywhere", () => {
    const phone = /tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
    expect(sources.filter((f) => phone.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
