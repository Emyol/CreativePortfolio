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
  /** How strongly the view shows, 0 to 1 (1 if left out). Fades this view alone. */
  opacity?: () => number;
};

export type Stage = {
  THREE: typeof THREE;
  renderer: THREE.WebGLRenderer;
  /** The room-light environment map every view's scene can use. */
  environment: THREE.Texture;
  /** Compiles a view's shaders without blocking the page (call before `add`). */
  prepare(view: View): Promise<void>;
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
  // Sized to the visible viewport in CSS too: `100vh` is the large viewport on phones, taller
  // than `innerHeight` while the toolbar shows, which stretched the drawing off the keys.
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  Object.assign(canvas.style, { position: "fixed", left: "0", top: "0", zIndex: "-1", pointerEvents: "none" });

  const pmrem = new three.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // A view fades by drawing the page's own colour over its box: the canvas sits behind the
  // page, so that reads as the view fading, and the other views on the canvas don't.
  const veil = new three.Mesh(new three.PlaneGeometry(2, 2), new three.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  const veilScene = new three.Scene().add(veil);
  const veilCamera = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pageColour = () => (veil.material.color.setStyle(getComputedStyle(document.documentElement).backgroundColor), undefined);
  pageColour();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pageColour);

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
      const shown = view.opacity?.() ?? 1;
      if (shown < 1) {
        veil.material.opacity = 1 - Math.max(0, shown);
        renderer.render(veilScene, veilCamera);
      }
    }
  };

  // One loop, only while there is something to draw and the tab can be seen.
  const run = () => renderer.setAnimationLoop(views.size && !document.hidden ? draw : null);
  document.addEventListener("visibilitychange", run);
  const resize = () => renderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", resize);
  // A lost context ends this stage: its views fall back, and the next view to ask makes a
  // fresh one (a dead renderer kept in the cache would take views and draw nothing).
  let dead = false;
  const created = stage;
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      dead = true;
      if (stage === created) stage = null;
      renderer.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("resize", resize);
      lost.forEach((cb) => cb());
      lost.clear();
      views.clear();
      canvas.remove();
      renderer.dispose();
    },
    { once: true },
  );
  const alive = () => {
    if (dead) throw new Error("the 3D stage lost its GPU context");
  };

  return {
    THREE: three,
    renderer,
    environment,
    async prepare(view) {
      alive();
      // Compiled on first draw, the physical materials froze the page for most of a second.
      await renderer.compileAsync(view.scene, view.camera);
    },
    add(view) {
      alive();
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
