"use client";
import type * as THREE from "three";
import type { MotionTier } from "@/lib/motion/tier";
import { makeMaterials } from "./materials";

let device: Promise<{ clone(): THREE.Group }> | null = null;

/**
 * The player's model (public/device/device.glb, meshopt-compressed), loaded once with its
 * materials rebuilt by name. Each view takes its own clone; clones share geometry and
 * materials, so a second view costs no download and little memory.
 */
export function loadDevice(three: typeof THREE, tier: MotionTier): Promise<{ clone(): THREE.Group }> {
  device ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync("/device/device.glb");
    const materials = makeMaterials(three, tier);
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const name = (mesh.material as THREE.Material).name;
      if (materials[name]) mesh.material = materials[name];
    });
    const template = gltf.scene as THREE.Group;
    return { clone: () => template.clone(true) };
  })().catch((e) => {
    device = null;
    throw e;
  });
  return device;
}
