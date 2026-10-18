// Compresses the device GLB from art/blender/side-a/out/device-raw.glb (written by
// `npm run device:render -- -- --only glb`) into public/device/device.glb for the page's 3D
// player: welded, lightly simplified and meshopt-compressed. Empty nodes (pivots, anchors)
// and material names are kept, because the page finds parts and rebuilds materials by name.
import { NodeIO, PropertyType } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { statSync } from "node:fs";

const IN = "art/blender/side-a/out/device-raw.glb";
const OUT = "public/device/device.glb";

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(IN);
await doc.transform(
  // Materials are not deduplicated: two with the same values keep their own names.
  dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }),
  prune({ keepLeaves: true, keepAttributes: true }),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.0005 }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write(OUT, doc);
console.log(`${OUT}: ${Math.round(statSync(OUT).size / 1024)} KB (from ${Math.round(statSync(IN).size / 1024)} KB)`);
