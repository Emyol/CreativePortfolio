"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { packScales } from "@/components/device/useReelMotion";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { loadDevice } from "@/lib/three/loadDevice";
import { getStage, type View } from "@/lib/three/stage";
import { makeTable } from "./table";
import styles from "./Flip3D.module.css";

const TIMEOUT = 8000; // without the model by then, the rendered frames take over
const DRAG = 700; // px of drag per half turn
const deg = (d: number) => (d * Math.PI) / 180;
const PACK_H = 0.8; // the packs' thickness, as a share of the model's
const PACK_RISE = (0.064 * (1 - PACK_H)) / 2; // keeps them centred where they were

/**
 * The tape turned over in real time (docs/superpowers/specs/2026-10-18-motion-design.md,
 * "The flip, smoother"): the model's cassette, scrubbed by the scroll through the flip and
 * spun by a drag, carrying on with momentum and settling on a side. The turn follows
 * device.py's flip pass: half a turn about the cassette's short axis, eased at both ends,
 * with a wobble and a lift mid-turn, seen from straight above through its 85 mm camera.
 * Reports `data-3d` and `data-turn` on the flip; calls `onFail` to hand back to the frames.
 */
export function Flip3D({ onFail }: { onFail: () => void }) {
  const tier = useMotionTier();
  const view = useRef<HTMLDivElement>(null);
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  });

  useEffect(() => {
    const el = view.current;
    const flip = el?.closest<HTMLElement>("[data-flip]");
    if (!el || !flip) return;
    const undo: (() => void)[] = [];
    let dead = false;
    const stop = () => {
      if (dead) return;
      dead = true;
      window.clearTimeout(timer);
      undo.splice(0).reverse().forEach((f) => f());
    };
    const giveUp = () => {
      stop();
      fail.current();
    };
    const timer = window.setTimeout(giveUp, TIMEOUT);

    (async () => {
      const stage = await getStage(tier);
      if (dead) return;
      const { THREE: three, environment } = stage;
      const model = await loadDevice(three, tier);
      if (dead) return;
      window.clearTimeout(timer);

      const { scene, dispose } = makeTable(three, environment, tier, -0.6);
      // Seen from straight above, every glossy flat mirrors the room's ceiling light; less of
      // the room keeps the tape dark and the shell its colour.
      scene.environmentIntensity = 0.35;
      undo.push(dispose);
      // device.py's flip camera: 85 mm on a 36 mm sensor, 15 units above, 3:2 (16.1° tall).
      const camera = new three.PerspectiveCamera(16.1, 1.5, 0.1, 100);
      camera.position.set(0, 15, 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);

      const cassette = model.clone().getObjectByName("Cassette");
      const packL = cassette?.getObjectByName("PackL");
      const packR = cassette?.getObjectByName("PackR");
      if (!cassette || !packL || !packR) throw new Error("device.glb has no Cassette with packs");
      cassette.removeFromParent();
      // The shell's inside face is drawn for the deck's window; turned over, it would hide
      // the reels from side B (device.py's flip pass leaves it out too).
      cassette.getObjectByName("Interior")?.removeFromParent();
      // Turned over, the inside of the reels and packs faces the camera: the model leaves
      // their undersides open (Blender drew both sides), so this copy draws both too.
      const sided = new Map<THREE.Material, THREE.Material>();
      cassette.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const m = mesh.material as THREE.Material;
        // Refraction has only the empty page to bend in mid-air: plain see-through glass, its
        // reflection kept low, since straight from above it mirrors the room's ceiling light.
        const glass = () => new three.MeshPhysicalMaterial({ color: "#F2F6F8", roughness: 0.06, transparent: true, opacity: 0.14, envMapIntensity: 0.15, depthWrite: false });
        if (!sided.has(m)) sided.set(m, Object.assign(m.name === "Window" ? glass() : m.clone(), { side: three.DoubleSide }));
        mesh.material = sided.get(m)!;
      });
      undo.push(() => sided.forEach((m) => m.dispose()));
      cassette.position.set(0, 0, 0);
      cassette.rotation.set(0, 0, 0, "YZX"); // Blender's XYZ, in glTF's axes
      // The packs, a touch thinner about their middle, so the hubs show through on side B
      // as in the rendered frames (the model's hubs stand barely proud of the tape).
      for (const pack of [packL, packR]) pack.position.y += PACK_RISE;
      const lift = new three.Group();
      lift.add(cassette);
      scene.add(lift);

      // The turn: the scroll's share of the flip, plus whole spins from dragging it.
      const turn = { scroll: 0, spin: 0 };
      const follow = gsap.quickTo(turn, "scroll", { duration: 0.3, ease: "power2.out" });
      const st = ScrollTrigger.create({ trigger: flip, start: "top top", end: "bottom bottom", onUpdate: (s) => follow(s.progress), onRefresh: (s) => follow(s.progress) });
      turn.scroll = st.progress;
      undo.push(() => {
        st.kill();
        gsap.killTweensOf(turn);
      });

      let shown = "";
      const v: View = {
        el,
        scene,
        camera,
        frame() {
          const t = turn.scroll + turn.spin;
          const whole = Math.floor(t);
          const f = t - whole;
          const eased = whole + f * f * (3 - 2 * f); // settles at both ends of each half turn
          cassette.rotation.set(deg(9) * Math.sin(Math.PI * t), deg(-4) * Math.sin(2 * Math.PI * t), -Math.PI * eased);
          lift.position.y = 1.6 * Math.abs(Math.sin(Math.PI * t));
          const s = packScales();
          packL.scale.set(s.left, PACK_H, s.left);
          packR.scale.set(s.right, PACK_H, s.right);
          const label = (Math.abs(t) < 0.005 ? 0 : t).toFixed(2);
          if (label !== shown) flip.dataset.turn = shown = label;
        },
      };

      // Grab it and spin it: let go and it carries on, then settles on a side.
      let drag: { x: number; at: number; v: number } | null = null;
      const down = (e: PointerEvent) => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, at: performance.now(), v: 0 };
        el.setPointerCapture(e.pointerId);
        gsap.killTweensOf(turn, "spin");
        el.dataset.grabbing = "";
      };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        const now = performance.now();
        const d = -(e.clientX - drag.x) / DRAG;
        turn.spin += d;
        drag.v = 0.7 * drag.v + 0.3 * (d / Math.max(0.008, (now - drag.at) / 1000));
        drag.x = e.clientX;
        drag.at = now;
      };
      const up = () => {
        if (!drag) return;
        const velocity = performance.now() - drag.at > 120 ? 0 : drag.v; // a held pause drops it
        drag = null;
        delete el.dataset.grabbing;
        gsap.to(turn, { inertia: { spin: { velocity, end: (n: number) => Math.round(n) }, duration: { min: 0.4, max: 1.2 } } });
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      undo.push(() => {
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      });

      undo.push(stage.add(v));
      undo.push(stage.onLost(giveUp));
      // Drawn once unseen, then it takes over from the poster frame.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      flip.setAttribute("data-3d", "");
      undo.push(() => {
        flip.removeAttribute("data-3d");
        delete flip.dataset.turn;
      });
    })().catch(giveUp);

    return stop;
  }, [tier]);

  return <div ref={view} className={styles.view} aria-hidden="true" data-flip-view />;
}
