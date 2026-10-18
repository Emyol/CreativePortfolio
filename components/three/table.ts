import type * as THREE from "three";
import type { MotionTier } from "@/lib/motion/tier";

/**
 * The table every 3D view sits on: the room's reflections, one key light that casts a soft
 * contact shadow onto a shadow-only ground at `groundY`, and a little fill.
 */
export function makeTable(three: typeof THREE, environment: THREE.Texture, tier: MotionTier, groundY = 0) {
  const scene = new three.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 0.9;
  const light = new three.DirectionalLight("#ffffff", 2.4);
  light.position.set(-5, 12, 6);
  light.castShadow = true;
  light.shadow.mapSize.setScalar(tier === "full" ? 2048 : 1024);
  Object.assign(light.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.radius = 6;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  scene.add(light, new three.AmbientLight("#ffffff", 0.35));
  const groundGeo = new three.PlaneGeometry(60, 60);
  const groundMat = new three.ShadowMaterial({ opacity: 0.22 });
  const ground = new three.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = groundY;
  ground.receiveShadow = true;
  scene.add(ground);
  return {
    scene,
    light,
    dispose() {
      groundGeo.dispose();
      groundMat.dispose();
    },
  };
}
