import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOTS = ["app", "components", "lib"];
const SKIP = [/\.test\.tsx?$/, /fixtures\.ts$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|json|css)$/.test(p) && !SKIP.some((r) => r.test(p)) ? [p] : [];
  });
}
const sources = ROOTS.flatMap(files).concat("lib/content/seed.json");
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/;

describe("content rules", () => {
  test("no Japanese layer is left from Kakejiku", () => {
    expect(sources.filter((f) => CJK.test(readFileSync(f, "utf8")))).toEqual([]);
  });
  test("no SVG filter textures in CSS (they re-rasterise on every scroll paint; use a PNG tile)", () => {
    const css = sources.filter((f) => f.endsWith(".css"));
    expect(css.filter((f) => /feTurbulence/.test(readFileSync(f, "utf8")))).toEqual([]);
  });
  test("no phone numbers anywhere", () => {
    const phone = /tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
    expect(sources.filter((f) => phone.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
