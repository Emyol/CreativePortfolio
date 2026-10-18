// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test } from "vitest";

const GLB = join(process.cwd(), "public", "device", "device.glb");

/** The GLB's JSON chunk (12-byte header, then chunk 0: length, type "JSON", data). */
function gltfJson(): { nodes: { name?: string }[]; extensionsUsed?: string[]; materials?: { name?: string }[] } {
  const buf = readFileSync(GLB);
  const length = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + length).toString("utf8"));
}

const MOVED = ["Key0", "Key1", "Key2", "Key3", "Cassette", "FrontHalf", "BackHalf", "PackL", "PackR", "HubLPivot", "HubRPivot", "KnobMarkPivot", "OLEDGlass", "LEDLens", "Body", "Underside"];
const ANCHORS = ["StickerAnchor", "DoorAnchor"].flatMap((a) => [a, ...["TL", "TR", "BR", "BL"].map((c) => `${a}${c}`)]);

test("the model has every node the page moves or anchors to", () => {
  expect(existsSync(GLB)).toBe(true);
  const names = new Set(gltfJson().nodes.map((n) => n.name));
  for (const n of [...MOVED, ...ANCHORS]) expect(names, n).toContain(n);
});

test("its materials are named as in device.py's M table, for the page to rebuild", () => {
  const names = new Set(gltfJson().materials?.map((m) => m.name));
  for (const n of ["Aluminium", "Knob", "OLED", "Shell", "Key"]) expect(names, n).toContain(n);
});

// The budget is what the page downloads: the file is served gzipped (meshopt data still
// compresses well). The raw guard catches the model quietly growing.
test("it fits the 500 KB budget as sent, and stays under 600 KB on disk", () => {
  expect(gzipSync(readFileSync(GLB), { level: 9 }).length).toBeLessThanOrEqual(512_000);
  expect(statSync(GLB).size).toBeLessThanOrEqual(600_000);
});

test("it is meshopt-compressed", () => expect(gltfJson().extensionsUsed).toContain("EXT_meshopt_compression"));
