"use client";
import type * as THREE from "three";
import type { MotionTier } from "@/lib/motion/tier";
import { makeMaterials } from "./materials";

const METAL = new Set(["Aluminium", "AluDoor", "Collar"]);
const CREASE = (35 * Math.PI) / 180;

const LEVEL = 0.005; // world units: faces whose corners differ less in height are level

/**
 * Simplifying the model left its flat metal faces a few thousandths off level, as long
 * slivers tilted every way, which a mirror-like finish shows as streaks. Any face of a
 * non-indexed geometry whose corners sit within `band` in height and that faces upward is
 * level: its normals point straight up. Walls and bevels span more height and keep theirs.
 */
export function levelFaces(geometry: THREE.BufferGeometry, band: number): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  const n = geometry.getAttribute("normal");
  for (let f = 0; f + 2 < pos.count; f += 3) {
    const [a, b, c] = [pos.getY(f), pos.getY(f + 1), pos.getY(f + 2)];
    const up = n.getY(f) + n.getY(f + 1) + n.getY(f + 2) > 0.6;
    if (!up || Math.max(a, b, c) - Math.min(a, b, c) > band) continue;
    for (let k = 0; k < 3; k++) n.setXYZ(f + k, 0, 1, 0);
  }
  n.needsUpdate = true;
  return geometry;
}

let device: Promise<{ clone(): THREE.Group }> | null = null;

/**
 * The player's model (public/device/device.glb, meshopt-compressed), loaded once with its
 * materials rebuilt by name. Each view takes its own clone; clones share geometry and
 * materials, so a second view costs no download and little memory.
 */
export function loadDevice(three: typeof THREE, tier: MotionTier): Promise<{ clone(): THREE.Group }> {
  device ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }, { toCreasedNormals }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
      import("three/examples/jsm/utils/BufferGeometryUtils.js"),
    ]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync("/device/device.glb");
    const materials = makeMaterials(three, tier);
    gltf.scene.updateMatrixWorld(true);
    const scale = new three.Vector3();
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const name = (mesh.material as THREE.Material).name;
      if (materials[name]) mesh.material = materials[name];
      // Compression leaves the metal's flat faces as long fans that smooth shading streaks;
      // creased normals keep flats flat and bevels round.
      if (METAL.has(name)) mesh.geometry = levelFaces(toCreasedNormals(mesh.geometry, CREASE), LEVEL / mesh.getWorldScale(scale).y);
    });
    const template = gltf.scene as THREE.Group;
    return { clone: () => template.clone(true) };
  })().catch((e) => {
    device = null;
    throw e;
  });
  return device;
}
