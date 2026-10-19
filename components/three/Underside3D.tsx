"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { packScales } from "@/components/device/useReelMotion";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { DOCK_RESERVE } from "@/lib/motion/hold";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { useHold, type Arrival } from "@/lib/motion/useHold";
import { loadDevice } from "@/lib/three/loadDevice";
import { getStage, type View } from "@/lib/three/stage";
import { rectFromCorners } from "./project";
import { addScreenPlane } from "./screenPlane";
import { drawScreen } from "./screenTexture";
import { makeTable } from "./table";
import styles from "./Underside3D.module.css";

const TIMEOUT = 8000; // without the model by then, the rendered underside stays
const H = 0.62; // the body's height (device.py)
const BOX_W = 9.36; // model units across the footer's device box (the sprite's framing)
const LIFT = 0.9; // kept low, so the shadow stays soft
const LANDED = 0.98; // from here the live text sits on the sticker and the door
const deg = (d: number) => (d * Math.PI) / 180;

/**
 * The tape's end: the player turns over in real time (docs/superpowers/specs/2026-10-18-
 * motion-design.md, "The footer: the device turns over"). The footer's device box holds
 * while the scroll turns it 180° about its long axis, rising a little and wobbling as in
 * spike-turnover.py, from its top (side B on the screen and the shell) to its underside,
 * with a real shadow on the page. Once it lands, the sticker's and the door's live text is
 * laid over the model's own sticker and door from their projected corners; it is in the
 * page, focusable, the whole time. Calls `onFail` to hand back to the rendered underside.
 */
export function Underside3D({ device, onFail }: { device: RefObject<HTMLDivElement | null>; onFail: () => void }) {
  const tier = useMotionTier();
  const view = useRef<HTMLDivElement>(null);
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  });
  const turn = useRef({ t: 0 }).current;
  // The hold comes with the 3D: a rendered underside has nothing to turn.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = view.current;
    const box = device.current;
    if (!el || !box) return;
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
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-dot").trim() || "Doto";
      const [model] = await Promise.all([loadDevice(three, tier), document.fonts.load(`900 150px ${family}`).catch(() => [])]);
      if (dead) return;

      const { scene, dispose } = makeTable(three, environment, tier);
      undo.push(dispose);
      // spike-turnover.py's camera: high and a little in front, looking down at the device.
      const camera = new three.PerspectiveCamera(20, 1, 0.1, 100);
      const target = new three.Vector3(0, 0.6, 0);
      camera.position.set(0, 21, 2.2);
      camera.up.set(0, 0, -1);
      camera.lookAt(target);

      // Turned about its mid-height: `pivot` rises and turns, the model hangs from it.
      const root = model.clone();
      // The model's printed key labels are side A's; no keys are read here.
      root.traverse((o) => {
        if (o.name.startsWith("Print_") && o.name !== "Print_miel") o.visible = false;
      });
      // The end of side B: its screen (laid while the model is still untransformed), and the
      // cassette turned to its B half.
      const screen = addScreenPlane(three, root);
      undo.push(screen.dispose);
      drawScreen(screen.ctx, ["SIDE B"], { family });
      screen.update();
      const cassette = root.getObjectByName("Cassette");
      const packL = cassette?.getObjectByName("PackL");
      const packR = cassette?.getObjectByName("PackR");
      if (!cassette || !packL || !packR) throw new Error("device.glb has no Cassette with packs");
      const before = new three.Box3().setFromObject(cassette).min.y;
      cassette.rotation.z = -Math.PI;
      cassette.updateMatrixWorld(true);
      cassette.position.y += before - new three.Box3().setFromObject(cassette).min.y;
      const pivot = new three.Group();
      root.position.y = -H / 2;
      pivot.add(root);
      scene.add(pivot);
      pivot.rotation.order = "YZX"; // Blender's XYZ, in glTF's axes

      const corners = (name: string) => ["TL", "TR", "BR", "BL"].map((c) => root.getObjectByName(name + c));
      const anchors = { sticker: corners("StickerAnchor"), door: corners("DoorAnchor") };
      if ([...anchors.sticker, ...anchors.door].some((o) => !o)) throw new Error("device.glb has no sticker or door anchors");
      const targets = {
        sticker: box.querySelector<HTMLElement>("[data-anchor='sticker']"),
        door: box.querySelector<HTMLElement>("[data-anchor='door']"),
      };

      // Framed so the device lands the size the rendered underside was, centred in its box;
      // the view reaches past the box so the shadow is never cut off.
      let framed = "";
      const frameCamera = (v: DOMRect, b: DOMRect) => {
        const key = `${v.width}x${v.height}/${b.width}`;
        if (key === framed) return;
        framed = key;
        camera.aspect = v.width / v.height;
        const halfH = ((BOX_W / 2) * (v.width / b.width)) / camera.aspect;
        camera.fov = (2 * Math.atan(halfH / camera.position.distanceTo(target)) * 180) / Math.PI;
        camera.updateProjectionMatrix();
      };

      const point = new three.Vector3();
      const saved = new Map<HTMLElement, string>();
      const place = (v: DOMRect, b: DOMRect) => {
        for (const [key, el] of Object.entries(targets) as [keyof typeof targets, HTMLElement | null][]) {
          if (!el) continue;
          if (!saved.has(el)) saved.set(el, el.style.cssText);
          const pts = anchors[key].map((o) => {
            o!.getWorldPosition(point).project(camera);
            return { x: v.left + ((point.x + 1) / 2) * v.width, y: v.top + ((1 - point.y) / 2) * v.height };
          });
          const r = rectFromCorners(pts);
          const rect = [r.left - b.left, r.top - b.top, r.width, r.height].map((n) => n.toFixed(1)).join(","); // in the box
          if (rect === el.dataset.rect) continue;
          Object.assign(el.style, { left: `${r.left - b.left}px`, top: `${r.top - b.top}px`, width: `${r.width}px`, height: `${r.height}px` });
          el.dataset.rect = rect;
          el.dataset.placed = "";
        }
      };
      undo.push(() =>
        saved.forEach((css, el) => {
          el.style.cssText = css;
          delete el.dataset.rect;
          delete el.dataset.placed;
        }),
      );

      let shown = "";
      let landed = false;
      const v: View = {
        el,
        scene,
        camera,
        fail: giveUp,
        frame() {
          const vr = el.getBoundingClientRect();
          const br = box.getBoundingClientRect();
          frameCamera(vr, br);
          const t = turn.t;
          const e = t * t * (3 - 2 * t);
          pivot.rotation.set(Math.PI * e, deg(-3) * Math.sin(2 * Math.PI * t), deg(-5) * Math.sin(Math.PI * t));
          pivot.position.y = H / 2 + LIFT * Math.sin(Math.PI * t);
          // Turned to its B half, the cassette shows its right pack on the left.
          const s = packScales();
          packL.scale.set(s.right, 1, s.right);
          packR.scale.set(s.left, 1, s.left);
          const label = t.toFixed(2);
          if (label !== shown) box.dataset.turn = shown = label;
          const now = t >= LANDED;
          if (now) {
            scene.updateMatrixWorld();
            camera.updateMatrixWorld();
            place(vr, br); // every frame it's landed: the box may still be moving with the page
          }
          if (now !== landed) {
            landed = now;
            box.toggleAttribute("data-landed", now);
          }
        },
      };
      undo.push(() => {
        box.removeAttribute("data-landed");
        delete box.dataset.turn;
        gsap.killTweensOf(turn);
      });

      await stage.prepare(v);
      if (dead) return;
      undo.push(stage.add(v));
      window.clearTimeout(timer); // on the stage: the timeout covered loading and compiling
      undo.push(stage.onLost(giveUp));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      box.setAttribute("data-3d", "");
      setReady(true);
      undo.push(() => {
        box.removeAttribute("data-3d");
        setReady(false);
      });
    })().catch((e) => {
      console.warn("[3D] the footer kept its fallback:", e);
      giveUp();
    });

    return stop;
  }, [tier, device, turn]);

  return (
    <>
      <div ref={view} className={styles.view} aria-hidden="true" data-underside-view />
      {ready && <UndersideHold device={device} turn={turn} />}
    </>
  );
}

/**
 * Holds the footer's device box while the scroll turns it. The footer ends soon after the
 * box, so on a tall screen the page would run out before the hold's end: it gets just enough
 * room below first (measured from the box and the footer's own content, not the pin).
 */
function UndersideHold({ device, turn }: { device: RefObject<HTMLDivElement | null>; turn: { t: number } }) {
  useLayoutEffect(() => {
    const box = device.current;
    const footer = box?.closest("footer");
    const meta = footer?.lastElementChild as HTMLElement | null;
    if (!box || !footer || !meta || meta.contains(box)) return;
    const own = footer.style.paddingBottom;
    const room = () => {
      footer.style.paddingBottom = own;
      const vh = window.innerHeight;
      const h = box.offsetHeight;
      const above = vh - DOCK_RESERVE;
      const bottom = h <= above ? (above + h) / 2 : 10 + h; // the box's bottom while held (holdStart)
      const style = getComputedStyle(footer);
      const after = meta.offsetHeight + parseFloat(style.rowGap || "0") + parseFloat(style.paddingBottom);
      const short = Math.ceil(vh - bottom - after);
      if (short > 0) footer.style.paddingBottom = `${parseFloat(style.paddingBottom) + short}px`;
    };
    room();
    ScrollTrigger.addEventListener("refreshInit", room);
    return () => {
      ScrollTrigger.removeEventListener("refreshInit", room);
      footer.style.paddingBottom = own;
    };
  }, [device]);
  const arrival = useMemo<Arrival>(() => ({ distance: 1000, hold: (tl) => void tl.fromTo(turn, { t: 0 }, { t: 1, duration: 1 }) }), [turn]);
  useHold(device, arrival, "underside");
  return null;
}
