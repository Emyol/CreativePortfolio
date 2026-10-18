"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { screenLines } from "@/components/device/Device";
import { boostReels, packScales, reelAngle } from "@/components/device/useReelMotion";
import { gsap } from "@/lib/motion/gsap";
import { getHeroScroll, subscribeHeroScroll } from "@/lib/motion/heroScroll";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { knobAngle, type SideId, type Track, type TrackId } from "@/lib/tape";
import { entranceDecision, getHero, setHero, type HeroApi } from "@/lib/three/heroReady";
import { loadDevice } from "@/lib/three/loadDevice";
import { getStage, type View } from "@/lib/three/stage";
import { canUse3D, hasGpuWebGL } from "@/lib/three/support";
import { addScreenPlane } from "./screenPlane";
import { drawScreen } from "./screenTexture";
import { makeTable } from "./table";
import styles from "./Hero3D.module.css";

type Props = {
  tracks: Track[];
  side: SideId;
  current: TrackId | null;
  /** What the screen shows instead of the track (the entrance, a song, a cue). */
  screen?: string[];
  progress?: number;
  led: boolean;
};

const TIMEOUT = 8000; // without the model by then, the sprite device stays
const FADE = 0.85; // scrolled away, the device fades toward 0.15
const MAX_TURN = 0.61; // a drag turns it up to about 35°
const deg = (d: number) => (d * Math.PI) / 180;

/**
 * The hero as the real player in 3D (docs/superpowers/specs/2026-10-18-motion-design.md,
 * "The hero: a real 3D player"), drawn by the shared stage into the hero's box. The sprite
 * device stays underneath as the poster and the fallback: its keys stay the real links,
 * moved over the 3D keys each frame, and all its text stays in the page. Until the model is
 * loaded and drawn, nothing changes; on failure, a timeout or a lost context it gives up and
 * the sprites show again.
 */
export function Hero3D(props: Props) {
  const tier = useMotionTier();
  const view = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const el = view.current;
    const hero = el?.closest<HTMLElement>("[data-hero]");
    const device = hero?.querySelector<HTMLElement>("[data-device]");
    if (!el || !hero || !device || !canUse3D(tier, hasGpuWebGL())) return;
    const html = document.documentElement;
    const undo: (() => void)[] = [];
    let dead = false;
    const stop = () => {
      if (dead) return;
      dead = true;
      window.clearTimeout(timer);
      undo.splice(0).reverse().forEach((f) => f());
    };
    const timer = window.setTimeout(stop, TIMEOUT);

    (async () => {
      // After the page has painted and settled its motion tier (it hydrates as "full").
      await new Promise<void>((r) => {
        const id = window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 1200 }) : window.setTimeout(r, 300);
        undo.push(() => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : window.clearTimeout(id)));
      });
      if (dead) return;
      const stage = await getStage(tier);
      if (dead) return;
      const { THREE: three, renderer, environment } = stage;
      const family = getComputedStyle(html).getPropertyValue("--font-dot").trim() || "Doto";
      const [model] = await Promise.all([loadDevice(three, tier), document.fonts.load(`900 150px ${family}`).catch(() => [])]);
      if (dead) return;
      window.clearTimeout(timer);

      const { scene, light, dispose: disposeTable } = makeTable(three, environment, tier);
      const camera = new three.PerspectiveCamera(28, 1, 0.1, 100);

      // The device: `lift` sinks it (scroll, the entrance's dip), `turner` tilts and turns it.
      const root = model.clone();
      const turner = new three.Group();
      const lift = new three.Group();
      turner.add(root);
      lift.add(turner);
      scene.add(lift);
      const node = (name: string) => {
        const o = root.getObjectByName(name);
        if (!o) throw new Error(`device.glb has no ${name}`);
        return o;
      };
      const keys = [0, 1, 2, 3].map((i) => node(`Key${i}`));
      const keyRest = keys.map((k) => k.position.y);
      const mark = node("KnobMarkPivot");
      const hubs = [node("HubLPivot"), node("HubRPivot")];
      const packs = { left: node("PackL"), right: node("PackR") };
      const cassette = node("Cassette");
      const casRest = cassette.position.clone();
      const casTurn = cassette.rotation.clone();
      // The model's printed key labels are side A's; the page prints the real ones.
      root.traverse((o) => {
        if (o.name.startsWith("Print_") && o.name !== "Print_miel") o.visible = false;
      });
      // This LED lights alone: the other views share the model's materials.
      const lens: THREE.Mesh[] = [];
      node("LEDLens").traverse((o) => (o as THREE.Mesh).isMesh && lens.push(o as THREE.Mesh));
      if (!lens.length) throw new Error("device.glb's LEDLens has no mesh");
      const led = (lens[0].material as THREE.MeshPhysicalMaterial).clone();
      lens.forEach((m) => (m.material = led));

      // The screen: live text on a canvas, laid just over the OLED glass.
      const { mesh: screen, geometry: screenGeo, ctx, update: screenChanged, dispose: disposeScreen } = addScreenPlane(three, root);
      undo.push(() => {
        disposeScreen();
        led.dispose();
        disposeTable();
        gsap.killTweensOf([cassette.position, cassette.rotation, mark.rotation, light.position, led, ...keys.map((k) => k.position)]);
      });

      let shown: string[] = [];
      let shownKey = "";
      let shownProgress: number | undefined;
      let flicker: gsap.core.Timeline | null = null;
      const paint = (dim = 1, lines = shown) => {
        drawScreen(ctx, lines, { dim, progress: shownProgress, family });
        screenChanged();
      };
      undo.push(() => flicker?.kill());

      // Where things stand: the visitor's tilt, drag turn, the entrance's dip and fade-in.
      const tilt = { x: 0, z: 0 };
      const turn = { y: 0 };
      const dip = { y: 0 };
      const fade = { v: 0 }; // drawn unseen until it takes over from the sprites
      let entered = false; // the entrance is playing in 3D: it drives keys, knob and LED
      let knobShown = knobAngle(props.tracks, props.side, props.current);
      mark.rotation.y = -deg(knobShown);

      // The canvas is fixed behind the page; while the hero is on screen it is the hero's.
      // The sprites fade out as the 3D fades in (not in a 3D entrance: they were never seen).
      let opacity = "";
      const applyFade = () => {
        const p = getHeroScroll();
        const o = p >= 1 ? 1 : fade.v * (1 - p * FADE);
        hero.style.setProperty("--sprite", entered ? "0" : (1 - fade.v).toFixed(3));
        const next = o >= 0.999 ? "" : o.toFixed(3);
        if (next === opacity) return;
        opacity = next;
        renderer.domElement.style.opacity = next;
        hero.style.setProperty("--fade3d", next || "1");
      };
      undo.push(subscribeHeroScroll(applyFade));
      undo.push(() => {
        renderer.domElement.style.opacity = "";
        hero.style.removeProperty("--fade3d");
        hero.style.removeProperty("--sprite");
      });
      applyFade();

      // Framing: three-quarters from the front, looking down (hero-3d.html's frame()).
      const frameCamera = () => {
        const r = el.getBoundingClientRect();
        const aspect = r.width / Math.max(1, r.height);
        if (aspect === camera.aspect) return;
        camera.aspect = aspect;
        // Phones: the hero hugs the device, so it comes closer to fill the width as the sprites do.
        const dist = (15.5 / Math.min(1, aspect / 1.35)) * (r.width < 768 ? 0.9 : 1);
        camera.position.set(0, dist * 0.78, dist * 0.62);
        camera.lookAt(0, -0.2, 0.35);
        camera.updateProjectionMatrix();
      };
      const toViewport = (v: THREE.Vector3, r: DOMRect) => {
        v.project(camera);
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      };

      // The keys stay the page's links, laid over the 3D keys' caps.
      const box = new three.Box3();
      const corner = new three.Vector3();
      const saved = new Map<HTMLElement, string>();
      const placeKeys = () => {
        const r = el.getBoundingClientRect();
        const d = device.getBoundingClientRect();
        keys.forEach((k, i) => {
          const a = device.querySelector<HTMLElement>(`[data-key-index="${i}"]`);
          if (!a) return;
          if (!saved.has(a)) saved.set(a, a.style.cssText);
          box.setFromObject(k);
          let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
          for (const [cx, cz] of [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]]) {
            const { x, y } = toViewport(corner.set(cx, box.max.y, cz), r);
            [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
          }
          // Moved by translate from where the page laid it out, so nothing counts as a shift.
          Object.assign(a.style, { translate: `${x0 - d.left - a.offsetLeft}px ${y0 - d.top - a.offsetTop}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
          a.dataset.keyX = String(Math.round((x0 + x1) / 2));
          a.dataset.keyY = String(Math.round((y0 + y1) / 2));
        });
      };
      undo.push(() =>
        saved.forEach((css, a) => {
          a.style.cssText = css;
          delete a.dataset.keyX;
          delete a.dataset.keyY;
        }),
      );

      let time = 0;
      const v: View = {
        el,
        scene,
        camera,
        frame(dt) {
          time += dt;
          const now = latest.current;
          const driving = entered && !!html.dataset.boot;
          frameCamera();

          // The scroll leans it back and sinks it into the table as the dock rises.
          const p = getHeroScroll();
          if (tier === "lite" && !drag) turn.y = Math.sin(time * 0.5) * deg(2);
          turner.rotation.set(tilt.x + p * 0.55, turn.y, tilt.z);
          lift.position.set(0, -p * 2.2 + dip.y, -p * 3);
          lift.scale.setScalar(1 - p * 0.28);

          // Reels and packs move with the sprites' (scroll, tape speed, reading progress).
          const angle = deg(reelAngle());
          hubs.forEach((h) => (h.rotation.y = angle));
          const s = packScales();
          packs.left.scale.set(s.left, 1, s.left);
          packs.right.scale.set(s.right, 1, s.right);

          if (!driving) {
            // The latched key sits down, a pressed one deeper; the knob points at the track.
            const ease = Math.min(1, dt * 28);
            keys.forEach((k, i) => {
              const a = device.querySelector(`[data-key-index="${i}"]`);
              const sink = a?.hasAttribute("data-pressed") ? 0.07 : a?.hasAttribute("data-latched") ? 0.045 : 0;
              k.position.y += (keyRest[i] - sink - k.position.y) * ease;
            });
            const target = knobAngle(now.tracks, now.side, now.current);
            if (target !== knobShown) {
              knobShown = target;
              gsap.to(mark.rotation, { y: -deg(target), duration: 0.5, ease: "back.out(1.6)", overwrite: true });
            }
            led.emissiveIntensity += ((now.led ? 2.5 : 0) - led.emissiveIntensity) * Math.min(1, dt * 20);
          }

          // The screen flickers to new text, except while the entrance types it out.
          const lines = now.screen ?? screenLines(now.tracks, now.side, now.current);
          const key = lines.join("\n");
          if (key !== shownKey) {
            const old = shown;
            shownKey = key;
            shownProgress = now.progress;
            flicker?.kill();
            if (html.dataset.boot || !old.length) {
              shown = lines;
              paint();
            } else {
              flicker = gsap
                .timeline()
                .call(() => paint(0.15, old))
                .call(() => paint(1, old), undefined, 0.04)
                .call(() => paint(0.15, old), undefined, 0.08)
                .call(() => ((shown = lines), paint()), undefined, 0.12);
            }
          } else if (now.progress !== shownProgress) {
            shownProgress = now.progress;
            if (!flicker?.isActive()) paint();
          }

          scene.updateMatrixWorld();
          camera.updateMatrixWorld();
          if (hero.hasAttribute("data-3d")) placeKeys(); // not while the sprites still show
        },
      };

      // Pointer: the device tilts toward the cursor and the light follows (desktop); a drag
      // turns it and it springs back; a click on the cassette pops it out of the window.
      const ndc = new three.Vector2();
      const ray = new three.Raycaster();
      let drag: { x: number; turns: boolean } | null = null;
      const aim = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = gsap.utils.clamp(-1, 1, ((e.clientX - r.left) / r.width) * 2 - 1);
        const py = gsap.utils.clamp(-1, 1, 1 - ((e.clientY - r.top) / r.height) * 2);
        ndc.set(px, py);
        return { px, py, over: e.clientY >= r.top && e.clientY <= r.bottom };
      };
      const onCassette = () => {
        ray.setFromCamera(ndc, camera);
        return ray.intersectObject(cassette, true).length > 0;
      };
      let dragStart = 0;
      const move = (e: PointerEvent) => {
        if (!hero.hasAttribute("data-3d")) return;
        const { px, py, over } = aim(e);
        if (drag) {
          if (drag.turns) turn.y = gsap.utils.clamp(-MAX_TURN, MAX_TURN, dragStart + (e.clientX - drag.x) * 0.006);
          return;
        }
        if (tier !== "full" || e.pointerType === "touch") return;
        gsap.to(tilt, { x: -py * 0.12, z: -px * 0.08, duration: 0.9, ease: "power3.out", overwrite: true });
        gsap.to(light.position, { x: -5 + px * 7, z: 6 - py * 5, duration: 1.2, ease: "power3.out", overwrite: true });
        if (over) hero.style.cursor = onCassette() ? "pointer" : "grab";
      };
      const down = (e: PointerEvent) => {
        if (!hero.hasAttribute("data-3d") || e.button !== 0 || (e.target as Element).closest("a, button")) return;
        drag = { x: e.clientX, turns: tier === "full" && e.pointerType !== "touch" };
        dragStart = turn.y;
        gsap.killTweensOf(turn);
      };
      const pop = () =>
        gsap
          .timeline()
          .to(cassette.position, { y: casRest.y + 0.9, duration: 0.35, ease: "power2.out" })
          .to(cassette.rotation, { x: casTurn.x - 0.18, duration: 0.35, ease: "power2.out" }, 0)
          .to(cassette.position, { y: casRest.y, duration: 0.55, ease: "bounce.out" }, 0.45)
          .to(cassette.rotation, { x: casTurn.x, duration: 0.4, ease: "power2.out" }, 0.45);
      const up = (e: PointerEvent) => {
        if (!drag) return;
        const { x, turns } = drag;
        drag = null;
        if (turns) gsap.to(turn, { y: 0, duration: 1.6, ease: "elastic.out(1, 0.45)", overwrite: true });
        if (e.type === "pointerup" && Math.abs(e.clientX - x) < 6) {
          aim(e);
          if (onCassette() && !gsap.isTweening(cassette.position)) pop();
        }
      };
      hero.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      undo.push(() => {
        hero.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        hero.style.cursor = "";
        gsap.killTweensOf([tilt, turn, dip, fade]);
      });

      // What the entrance asks of it: the screen to shrink into, and the tape load in 3D.
      const api: HeroApi = {
        screenRect() {
          frameCamera();
          scene.updateMatrixWorld();
          const r = el.getBoundingClientRect();
          const { width: w, height: h } = screenGeo.parameters;
          const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => toViewport(screen.localToWorld(corner.set(x, y, 0)), r));
          const xs = pts.map((q) => q.x);
          const ys = pts.map((q) => q.y);
          return new DOMRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        },
        entrance(tl, at) {
          entered = true;
          const target = knobAngle(latest.current.tracks, latest.current.side, latest.current.current);
          knobShown = target;
          const reels = { v: 0 };
          const spin = () => boostReels(reels.v);
          tl.fromTo(fade, { v: 0 }, { v: 1, duration: 0.6, ease: "none", onUpdate: applyFade }, at - 0.55)
            // The tape drops in and the deck takes its weight.
            .fromTo(cassette.position, { y: casRest.y + 6 }, { y: casRest.y, duration: 0.6, ease: "power3.in" }, at)
            .fromTo(cassette.rotation, { x: casTurn.x - 0.3, z: casTurn.z + 0.08 }, { x: casTurn.x, z: casTurn.z, duration: 0.6, ease: "power3.in" }, at)
            .to(dip, { y: -0.08, duration: 0.08, ease: "power2.out" }, at + 0.6)
            .to(dip, { y: 0, duration: 0.5, ease: "elastic.out(1, 0.45)" }, at + 0.68)
            // The reels spin up past idle, the LED catches, the knob swings to the track.
            .to(reels, { v: 14, duration: 0.5, ease: "power2.in", onUpdate: spin }, at + 0.68)
            .to(reels, { v: 0, duration: 0.9, ease: "power2.out", onUpdate: spin }, at + 1.18)
            .fromTo(led, { emissiveIntensity: 0 }, { emissiveIntensity: 2.5, duration: 0.08, repeat: 3, yoyo: true, ease: "steps(1)" }, at + 0.7)
            .to(led, { emissiveIntensity: 2.5, duration: 0.1 }, at + 1.0)
            .fromTo(mark.rotation, { y: -deg(-250) }, { y: -deg(target), duration: 0.9, ease: "back.out(1.3)" }, at + 0.8);
          keys.forEach((k, j) => tl.fromTo(k.position, { y: keyRest[j] - 0.06 }, { y: keyRest[j], duration: 0.42, ease: "back.out(2.2)" }, at + 0.75 + j * 0.075));
        },
      };

      undo.push(stage.add(v));
      undo.push(stage.onLost(stop));
      // Draw it unseen first (shaders compile, the screen paints), then take over.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      const activate = () => {
        if (dead) return;
        applyFade();
        hero.setAttribute("data-3d", "");
        // A short crossfade, unless an entrance is about to play it in (its own fade-in).
        if (html.dataset.boot) {
          fade.v = 1;
          applyFade();
        } else gsap.to(fade, { v: 1, duration: 0.5, ease: "power1.inOut", onUpdate: applyFade });
        setHero(api);
        undo.push(() => {
          hero.removeAttribute("data-3d");
          if (getHero() === api) setHero(null);
        });
      };
      // An entrance that already chose the sprites finishes on them; the 3D swaps in after.
      if (html.dataset.boot && entranceDecision() === "sprite") {
        const mo = new MutationObserver(() => {
          if (html.dataset.boot) return;
          mo.disconnect();
          activate();
        });
        mo.observe(html, { attributes: true, attributeFilter: ["data-boot"] });
        undo.push(() => mo.disconnect());
      } else activate();
    })().catch(stop);

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per tier; props are read live
  }, [tier]);

  return <div ref={view} className={styles.view} aria-hidden="true" data-hero-view />;
}
