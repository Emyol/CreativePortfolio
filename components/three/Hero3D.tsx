"use client";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { screenLines } from "@/components/device/Device";
import { screenKey } from "@/components/device/Screen";
import { boostReels, packScales, reelAngle } from "@/components/device/useReelMotion";
import { gsap } from "@/lib/motion/gsap";
import { getHeroScroll, subscribeHeroScroll } from "@/lib/motion/heroScroll";
import { marqueeAt } from "@/lib/motion/marquee";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { keySlots, knobAngle, type SideId, type Track, type TrackId } from "@/lib/tape";
import { entranceDecision, getHero, setHero, type HeroApi } from "@/lib/three/heroReady";
import { loadDevice } from "@/lib/three/loadDevice";
import { getStage, type View } from "@/lib/three/stage";
import { canDraw3D } from "@/lib/three/support";
import { computeTier, NARROW_QUERY, REDUCE_QUERY } from "@/lib/motion/tier";
import { addKeyLabels, PLANE_H, PLANE_W } from "./keyLabels";
import { addScreenPlane } from "./screenPlane";
import { drawScreen, HEAD_SIZE, headlineShift, measureHead } from "./screenTexture";
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

const TIMEOUT = 8000; // without the model by then, the sprite device shows instead
const FADE = 0.85; // scrolled away, the device fades toward 0.15
const MAX_TURN = 0.61; // a drag turns it up to about 35°
const deg = (d: number) => (d * Math.PI) / 180;

/**
 * The hero as the real player in 3D (docs/superpowers/specs/2026-10-18-motion-design.md,
 * "The hero: a real 3D player"), drawn by the shared stage into the hero's box; under reduced
 * motion it is held still. It is the hero's only look: the sprite device stays in the page
 * unseen, its keys the real links moved over the 3D keys each frame, its labels printed on
 * the 3D plate. Until the model is loaded and drawn the hero is empty; on failure, a timeout
 * or a lost context it gives up and the sprites show instead, for the rest of this page.
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
    if (!el || !hero || !device) return;
    const html = document.documentElement;
    // No 3D here (no GPU, or the page's script came after the failsafe; settleGl clears
    // html[data-gl]), or given up already on this page: the flat device it is.
    if (!canDraw3D() || hero.hasAttribute("data-fallback")) return;
    // Hydration renders with the "full" tier first; the right one remounts this straight after.
    if (tier !== computeTier(matchMedia(REDUCE_QUERY).matches, matchMedia(NARROW_QUERY).matches)) return;
    const still = tier === "none"; // reduced motion: the player, held still
    const undo: (() => void)[] = [];
    let dead = false;
    const stop = () => {
      if (dead) return;
      dead = true;
      window.clearTimeout(timer);
      undo.splice(0).reverse().forEach((f) => f());
    };
    // Given up for good (timeout, failure, lost GPU): the flat device shows instead, for the
    // rest of this page (a remount keeps it), so it never swaps back and forth.
    const giveUp = () => {
      hero.setAttribute("data-fallback", "");
      stop();
    };
    const timer = window.setTimeout(giveUp, TIMEOUT);

    (async () => {
      // During the entrance the dark screen waits for the player, and a remount replaces one
      // just shown: both load at once. Otherwise after the page has painted.
      if (!html.dataset.boot && !hero.hasAttribute("data-shown")) {
        await new Promise<void>((r) => {
          const id = window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: 600 }) : window.setTimeout(r, 200);
          undo.push(() => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : window.clearTimeout(id)));
        });
      }
      if (dead) return;
      const stage = await getStage(tier);
      if (dead) return;
      const { THREE: three, environment } = stage;
      const family = getComputedStyle(html).getPropertyValue("--font-dot").trim() || "Doto";
      const mono = getComputedStyle(html).getPropertyValue("--font-mono").trim() || "monospace";
      const [model] = await Promise.all([
        loadDevice(three, tier),
        document.fonts.load(`900 150px ${family}`).catch(() => []),
        document.fonts.load(`400 54px ${mono}`).catch(() => []),
      ]);
      if (dead) return;

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
      // The model's printed key labels are side A's only: the plate prints the real ones,
      // live, in their place.
      const prints = ["about", "events", "mixtape", "people"].map((n) => node(`Print_${n}`));
      prints.forEach((p) => (p.visible = false));
      // Phones print the labels larger: the whole player is small there.
      const printed = addKeyLabels(three, root, keys, prints, mono, matchMedia(NARROW_QUERY).matches ? 1.5 : 1);
      let printedKey = "";
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
        printed.dispose();
        delete hero.dataset.printed;
        led.dispose();
        disposeTable();
        gsap.killTweensOf([cassette.position, cassette.rotation, mark.rotation, light.position, led, ...keys.map((k) => k.position)]);
      });

      let shown: string[] = [];
      let shownKey = "";
      let shownProgress: number | undefined;
      let flicker: gsap.core.Timeline | null = null;
      // A headline too long comes round (lib/motion/marquee.ts): from when it was shown, how
      // far it moves to come round (0: it fits, or held still under reduced motion), and how
      // far it has (null at rest, cut short).
      let headAt = 0;
      let headShift = 0;
      let headScroll: number | null = null;
      const show = (lines: string[]) => {
        if (lines[0] !== shown[0]) {
          headAt = time;
          headShift = still ? 0 : headlineShift(lines, measureHead(ctx, family));
          headScroll = headShift ? 0 : null;
        }
        shown = lines;
      };
      const paint = (dim = 1, lines = shown) => {
        drawScreen(ctx, lines, { dim, progress: shownProgress, family, scroll: headScroll ?? undefined });
        screenChanged();
      };
      undo.push(() => flicker?.kill());

      // Where things stand: the visitor's tilt, drag turn, the entrance's dip and fade-in.
      const tilt = { x: 0, z: 0 };
      const turn = { y: 0 };
      const dip = { y: 0 };
      const fade = { v: 0 }; // drawn unseen until it takes over
      let entered = false; // the entrance is playing in 3D: it drives keys, knob and LED
      let knobShown = knobAngle(props.tracks, props.side, props.current);
      mark.rotation.y = -deg(knobShown);

      // How strongly the 3D hero shows: faded in as it appears, out as the page scrolls on (the
      // stage fades this view alone). The flat device is never shown alongside it.
      let strength = 0;
      let label = "";
      const applyFade = () => {
        strength = fade.v * (1 - getHeroScroll() * FADE);
        const next = strength >= 0.999 ? "1" : strength.toFixed(3);
        if (next !== label) hero.style.setProperty("--fade3d", (label = next));
      };
      undo.push(subscribeHeroScroll(applyFade));
      undo.push(() => {
        hero.style.removeProperty("--fade3d");
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
        // Every read before any write, and sizes written only when they change: a write
        // between reads forced a layout per key, every frame.
        const r = el.getBoundingClientRect();
        const d = device.getBoundingClientRect();
        const placed = keys.map((k, i) => {
          const a = device.querySelector<HTMLElement>(`[data-key-index="${i}"]`);
          if (!a) return null;
          if (!saved.has(a)) saved.set(a, a.style.cssText);
          box.setFromObject(k);
          let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
          for (const [cx, cz] of [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]]) {
            const { x, y } = toViewport(corner.set(cx, box.max.y, cz), r);
            [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
          }
          return { a, x0, y0, x1, y1, left: a.offsetLeft, top: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
        });
        for (const p of placed) {
          if (!p) continue;
          const { a, x0, y0, x1, y1 } = p;
          // Moved by translate from where the page laid it out, so nothing counts as a shift.
          a.style.translate = `${x0 - d.left - p.left}px ${y0 - d.top - p.top}px`;
          if (Math.abs(x1 - x0 - p.w) >= 0.5) a.style.width = `${x1 - x0}px`;
          if (Math.abs(y1 - y0 - p.h) >= 0.5) a.style.height = `${y1 - y0}px`;
          a.dataset.keyX = String(Math.round((x0 + x1) / 2));
          a.dataset.keyY = String(Math.round((y0 + y1) / 2));
        }
        // Where each label is printed, on screen (for checks of its legibility).
        printed.meshes.forEach((m, i) => {
          const a = placed[i]?.a;
          if (!a) return;
          const pts = [[-PLANE_W / 2, -PLANE_H / 2], [PLANE_W / 2, -PLANE_H / 2], [PLANE_W / 2, PLANE_H / 2], [-PLANE_W / 2, PLANE_H / 2]].map(([x, y]) => toViewport(m.localToWorld(corner.set(x, y, 0)), r));
          const xs = pts.map((q) => q.x);
          const ys = pts.map((q) => q.y);
          const rect = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map((n) => Math.round(n)).join(",");
          if (a.dataset.printRect !== rect) a.dataset.printRect = rect;
        });
      };
      undo.push(() =>
        saved.forEach((css, a) => {
          a.style.cssText = css;
          delete a.dataset.keyX;
          delete a.dataset.keyY;
          delete a.dataset.printRect;
        }),
      );

      let time = 0;
      const v: View = {
        el,
        scene,
        camera,
        fail: giveUp,
        opacity: () => strength,
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
            const ease = still ? 1 : Math.min(1, dt * 28);
            keys.forEach((k, i) => {
              const a = device.querySelector(`[data-key-index="${i}"]`);
              const sink = a?.hasAttribute("data-pressed") ? 0.07 : a?.hasAttribute("data-latched") ? 0.045 : 0;
              k.position.y += (keyRest[i] - sink - k.position.y) * ease;
            });
            const target = knobAngle(now.tracks, now.side, now.current);
            if (target !== knobShown) {
              knobShown = target;
              if (still) mark.rotation.y = -deg(target);
              else gsap.to(mark.rotation, { y: -deg(target), duration: 0.5, ease: "back.out(1.6)", overwrite: true });
            }
            led.emissiveIntensity += ((now.led ? 2.5 : 0) - led.emissiveIntensity) * Math.min(1, dt * 20);
          }

          // The keys' labels, printed on the plate (the side's tracks; a blank key, none).
          const texts = keySlots(now.tracks, now.side).map((s) => s.track?.label.toLowerCase() ?? "");
          const labels = texts.join("|");
          if (labels !== printedKey) {
            printed.set(texts);
            hero.dataset.printed = printedKey = labels;
          }

          // The screen flickers to new text, except while the entrance types it out.
          const lines = now.screen ?? screenLines(now.tracks, now.side, now.current);
          const key = screenKey(lines);
          if (key !== shownKey) {
            const old = shown;
            shownKey = key;
            shownProgress = now.progress;
            flicker?.kill();
            if (html.dataset.boot || !old.length || still) {
              show(lines);
              paint();
            } else {
              flicker = gsap
                .timeline()
                .call(() => paint(0.15, old))
                .call(() => paint(1, old), undefined, 0.04)
                .call(() => paint(0.15, old), undefined, 0.08)
                .call(() => (show(lines), paint()), undefined, 0.12);
            }
          } else if ((now.progress !== shownProgress || lines.join("\n") !== shown.join("\n")) && !flicker?.isActive()) {
            // The playhead moved or the clock ticked: no flicker.
            shownProgress = now.progress;
            show(lines);
            paint();
          }
          const scroll = headShift ? marqueeAt((time - headAt) * 1000, headShift, HEAD_SIZE) : null;
          if (scroll !== headScroll && !flicker?.isActive()) {
            headScroll = scroll;
            paint();
          }

          scene.updateMatrixWorld();
          camera.updateMatrixWorld();
          if (hero.hasAttribute("data-3d")) placeKeys(); // not before it takes over
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
        // Held still under reduced motion: no turning, no popping the cassette.
        if (still || !hero.hasAttribute("data-3d") || e.button !== 0 || (e.target as Element).closest("a, button")) return;
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

      await stage.prepare(v);
      if (dead) return;
      undo.push(stage.add(v));
      window.clearTimeout(timer); // on the stage: the timeout covered loading and compiling
      undo.push(stage.onLost(giveUp));
      // Draw it unseen first (shaders compile, the screen paints), then take over.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (dead) return;
      const activate = () => {
        if (dead) return;
        applyFade();
        // A remount (the motion tier changed) keeps the hero element, and its mark: the player
        // was just on screen. A new visit to the page starts afresh.
        const back = hero.hasAttribute("data-shown");
        hero.setAttribute("data-3d", "");
        hero.setAttribute("data-shown", "");
        // A short fade-in, unless an entrance is about to play it in (its own fade-in), it is
        // held still, or it takes the place of the player that was just there.
        if (html.dataset.boot || still || back) {
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
    })().catch((e) => {
      console.warn("[3D] the hero kept its fallback:", e);
      giveUp();
    });

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once per tier; props are read live
  }, [tier]);

  return <div ref={view} className={styles.view} aria-hidden="true" data-hero-view />;
}
