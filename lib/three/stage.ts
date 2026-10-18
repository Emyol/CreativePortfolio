"use client";
import type * as THREE from "three";
import type { MotionTier } from "@/lib/motion/tier";
import { dprFor, scissorFor } from "./support";

/** A place on the page the 3D draws into: its element's box, its scene, its camera. */
export type View = {
  el: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Called each frame the view is on screen, before it renders (seconds since last frame). */
  frame?: (dt: number) => void;
};

export type Stage = {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  /** The room-light environment map every view's scene can use. */
  environment: THREE.Texture;
  add(view: View): () => void;
  onLost(cb: () => void): () => void;
};

let stage: Promise<Stage> | null = null;

/**
 * The one 3D stage for the whole site: a single WebGL canvas fixed behind the page, which
 * draws each view (hero, flip, footer) into its element's box with a scissor, only while
 * that box is on screen and the tab is visible. three.js loads here, on first use, never
 * at module top, so nothing 3D loads before first paint.
 */
export function getStage(tier: MotionTier): Promise<Stage> {
  stage ??= create(tier).catch((e) => {
    stage = null;
    throw e;
  });
  return stage;
}

async function create(tier: MotionTier): Promise<Stage> {
  const three = await import("three");
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");

  const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(dprFor(tier, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = three.SRGBColorSpace;
  renderer.toneMapping = three.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = three.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("data-stage", "");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", zIndex: "-1", pointerEvents: "none" });

  const pmrem = new three.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const views = new Set<View>();
  const lost = new Set<() => void>();
  let last = performance.now();

  const draw = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    const h = window.innerHeight;
    for (const view of views) {
      const rect = view.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > h || rect.width === 0 || rect.height === 0) continue;
      view.frame?.(dt);
      const [x, y, w, hh] = scissorFor(rect, h);
      renderer.setViewport(x, y, w, hh);
      renderer.setScissor(x, y, w, hh);
      if (view.camera.aspect !== w / hh) {
        view.camera.aspect = w / hh;
        view.camera.updateProjectionMatrix();
      }
      renderer.render(view.scene, view.camera);
    }
  };

  // One loop, only while there is something to draw and the tab can be seen.
  const run = () => renderer.setAnimationLoop(views.size && !document.hidden ? draw : null);
  document.addEventListener("visibilitychange", run);
  window.addEventListener("resize", () => renderer.setSize(window.innerWidth, window.innerHeight, false));
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost.forEach((cb) => cb());
  });

  return {
    THREE: three,
    renderer,
    environment,
    add(view) {
      // The canvas is in the page only while some view uses it (none under reduced motion).
      if (!canvas.isConnected) document.body.prepend(canvas);
      views.add(view);
      run();
      return () => {
        views.delete(view);
        run();
        // The loop may have stopped: don't leave the view's last frame on the canvas.
        renderer.setScissorTest(false);
        renderer.clear();
        if (!views.size) canvas.remove();
      };
    },
    onLost(cb) {
      lost.add(cb);
      return () => lost.delete(cb);
    },
  };
}
