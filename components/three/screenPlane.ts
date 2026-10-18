import type * as THREE from "three";
import { SCREEN_H, SCREEN_W } from "./screenTexture";

/**
 * The device's screen as live text: a canvas texture on a plane laid just over the model's
 * OLED glass (added to `root`, the device's model, untransformed when this is called).
 */
export function addScreenPlane(three: typeof THREE, root: THREE.Object3D) {
  const glass = root.getObjectByName("OLEDGlass");
  if (!glass) throw new Error("device.glb has no OLEDGlass");
  root.updateMatrixWorld(true);
  const gbox = new three.Box3().setFromObject(glass);
  const gsize = gbox.getSize(new three.Vector3());
  const gcentre = gbox.getCenter(new three.Vector3());
  const canvas = Object.assign(document.createElement("canvas"), { width: SCREEN_W, height: SCREEN_H });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2D canvas");
  const tex = new three.CanvasTexture(canvas);
  tex.colorSpace = three.SRGBColorSpace;
  tex.anisotropy = 8;
  const geometry = new three.PlaneGeometry(gsize.x * 0.94, gsize.z * 0.9);
  const material = new three.MeshBasicMaterial({ map: tex, toneMapped: false });
  const mesh = new three.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(gcentre.x, gbox.max.y + 0.002, gcentre.z);
  root.add(mesh);
  return {
    mesh,
    geometry,
    ctx,
    /** Call after drawing on `ctx`. */
    update: () => (tex.needsUpdate = true),
    dispose: () => [geometry, material, tex].forEach((d) => d.dispose()),
  };
}
