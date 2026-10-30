"use client";
import type * as THREE from "three";
import { addKeyLabels, LEGEND, PLANE_H, PLANE_W } from "@/components/three/keyLabels";
import { buildTapes, disposeTapes, labelPoint, SUB_LINE, tapeSwatch, type Swatch } from "@/components/three/tapes";
import { makeTable } from "@/components/three/table";
import type { SiteContent } from "@/lib/content/schema";
import { SCATTER, releaseVelocity, stepDesk, type Bounds, type Box } from "@/lib/desk/physics";
import { TIMING } from "@/lib/desk/timing";
import { isFirstInsert, markInserted } from "@/lib/desk/visit";
import { gsap } from "@/lib/motion/gsap";
import { NARROW_QUERY, type MotionTier } from "@/lib/motion/tier";
import { playClunk } from "@/lib/sound";
import { formatTrackNumber, keySlots, type Track, type TrackId } from "@/lib/tape";
import { loadDevice } from "@/lib/three/loadDevice";
import { getStage, type View } from "@/lib/three/stage";
import { deskFraming } from "./deskFraming";
import { SWITCH, EJECT, tapeMotion, type InsertKind, type Tape } from "./deskMotion";
import type { PointerScene } from "./deskPointer";
import { deskScreen } from "./deskScreen";

export type DeskState = "desk" | "deck";
/** A tape, the whole player, or a key's top face (`key0` is the first, as in `keySlots`). */
export type ProjectId = TrackId | "player" | `key${number}`;
type Lines = [string, string];

const LIFT = 3; // how high a tape flies over the slot, in player heights
const DETENT = (24 * Math.PI) / 180; // the knob turns this far a step
const DIP = 0.08; // how far the deck dips as a tape drops in

// Day's light, and night's: the room's light all but out and the lamp's warm pool following
// the pointer. The pool stays below where the tapes' paper clips white, so the print in it
// keeps its contrast; out of it, what is printed catches a little light (`print`, the labels'
// own emissive) and the plate's print lights as a legend (`legend`), so every word reads in
// the dark room too.
const DAY = { key: 2.4, ambient: 0.35, environment: 0.9 } as const;
const NIGHT = { key: 0.1, ambient: 0.04, environment: 0.1, lamp: 120, print: 0.35, legend: 1 } as const;

export type SceneHooks = {
  onInsert(id: TrackId): void;
  onInspect(id: TrackId | null): void;
  /** The tape the pointer or focus lifts changed (null: none). */
  onHover?(id: TrackId | null): void;
  onFrame?(): void;
  fail(): void;
};

export type DeskScene = PointerScene & {
  view: View;
  sync(state: DeskState, current: TrackId | null, initial?: boolean): void;
  project(id: ProjectId): DOMRect | null;
  screen(lines: Lines, progress?: number): void;
  /** The lines the screen shows now, one per line of text. */
  screenText(): string;
  /** The headline as drawn: whole, set smaller to fit, or cut short (ending in `…`). */
  screenHeadline(): { text: string; size: number } | null;
  led(on: boolean): void;
  slotOnScreen(): { x: number; y: number };
  wiggle(): void;
  /**
   * The first visit's nudge: the tape lifts a little and settles. False when it can't now
   * (reduced motion, the tape in a hand or lifted, a tape held up, off the desk).
   */
  nudge(id: TrackId): boolean;
  /** Input arrived: a nudge still going settles now. */
  calm(): void;
  setNight(on: boolean, instant?: boolean): void;
  /**
   * Reduced motion on or off, in place (no rebuild: the tapes stay where they are). On, what
   * is moving ends where it was going, now, and a sliding tape stops.
   */
  setStill(on: boolean): void;
  seatedId(): TrackId | null;
  /** For measuring the print as lit (tests): paints a key's label or a tape's sub-line as a swatch (tapes.ts), or as its words again. */
  printSwatch(id: `key${number}` | TrackId, mode: Swatch | null): void;
  /**
   * Where printed text lies on the page, for measuring it as drawn: the four corners of a
   * key's label on the plate (`key0` is the first) or of a tape's sub-line on its label.
   */
  printQuad(id: `key${number}` | TrackId): { x: number; y: number }[] | null;
  dispose(): void;
};

/**
 * The desk in 3D (docs/superpowers/specs/2026-10-28-v2-desk-design.md, "The three states"):
 * the player right of centre, the six tapes scattered to its left on a physics desk, a lamp
 * for the night. Drawn by the shared stage into `el`'s box: the whole viewport on the desk,
 * the corner box on the deck (deskFraming). The route drives it through `sync`; the tapes'
 * moves are deskMotion's. `tier` sets the drawing's quality and whether it starts still
 * (reduced motion); `setStill` switches the motion live. Returns null if `dead()` turns true
 * while loading.
 */
export async function createDeskScene(o: {
  el: HTMLElement;
  tier: MotionTier;
  tracks: Track[];
  content: SiteContent;
  hooks: SceneHooks;
  dead: () => boolean;
}): Promise<DeskScene | null> {
  const { el, tier, tracks, content, hooks } = o;
  const stage = await getStage(tier);
  if (o.dead()) return null;
  const three = stage.THREE;
  const css = getComputedStyle(document.documentElement);
  const family = css.getPropertyValue("--font-dot").trim() || "Doto";
  const mono = css.getPropertyValue("--font-mono").trim() || "monospace";
  const [model] = await Promise.all([
    loadDevice(three, tier),
    document.fonts.load(`900 150px ${family}`).catch(() => []),
    document.fonts.load(`700 120px ${mono}`).catch(() => []),
    document.fonts.load(`400 54px ${mono}`).catch(() => []),
  ]);
  if (o.dead()) return null;
  let still = tier === "none";

  // The player, its feet on the desk. Its underside is for turning over (later): hidden.
  const device = model.clone();
  const node = (name: string) => {
    const n = device.getObjectByName(name);
    if (!n) throw new Error(`device.glb has no ${name}`);
    return n;
  };
  device.updateMatrixWorld(true);
  const deviceBox = new three.Box3().setFromObject(device);
  const size = deviceBox.getSize(new three.Vector3());
  const groundY = deviceBox.min.y;
  const W = size.x;
  const D = size.z;
  const underside = device.getObjectByName("Underside");
  if (underside) underside.visible = false;

  const { scene, light, ambient, dispose: disposeTable } = makeTable(three, stage.environment, tier, groundY);
  Object.assign(light.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
  light.shadow.camera.updateProjectionMatrix();
  scene.add(device);
  const screenApi = deskScreen(three, device, family, still);
  // The keys' labels, printed live on the plate, placed while the model is
  // still where it was made: the model's own prints are side A's four names whatever the
  // content, so they hide, and an empty track's key stays blank.
  const keyNodes = [0, 1, 2, 3].map((i) => node(`Key${i}`));
  const prints = ["about", "events", "mixtape", "people"].map((n) => node(`Print_${n}`));
  prints.forEach((p) => (p.visible = false));
  const keyLabels = addKeyLabels(three, device, keyNodes, prints, mono, matchMedia(NARROW_QUERY).matches ? 1.5 : 1);
  keyLabels.set(keySlots(tracks).slice(0, keyNodes.length).map((s) => s.track?.label ?? ""));
  // The nameplate is printed in the model; its ink lights at night like the keys' legend
  // (its own copy of the ink: other views share the model's materials).
  const nameplate: THREE.Mesh[] = [];
  node("Print_miel").traverse((x) => (x as THREE.Mesh).isMesh && nameplate.push(x as THREE.Mesh));
  const nameInk = (nameplate[0]?.material as THREE.MeshStandardMaterial | undefined)?.clone();
  if (nameInk) {
    nameInk.emissive.set(LEGEND);
    nameInk.emissiveIntensity = 0;
    nameplate.forEach((m) => (m.material = nameInk));
  }
  device.position.x = W * 0.34;
  device.updateMatrixWorld(true);
  deviceBox.setFromObject(device);

  // The player's own cassette marks the slot; the slot starts empty.
  const slot = node("Cassette");
  const slotP = new three.Vector3();
  const slotQ = new three.Quaternion();
  slot.matrixWorld.decompose(slotP, slotQ, new three.Vector3());
  const template = slot.clone(true);
  slot.visible = false;

  // This LED lights alone: other views share the model's materials.
  const lens: THREE.Mesh[] = [];
  node("LEDLens").traverse((x) => (x as THREE.Mesh).isMesh && lens.push(x as THREE.Mesh));
  const ledMat = (lens[0].material as THREE.MeshPhysicalMaterial).clone();
  lens.forEach((m) => (m.material = ledMat));
  const mark = node("KnobMarkPivot");
  let knobTo = mark.rotation.y;

  // The tapes, each with a body on the desk where SCATTER puts its number.
  const tapes = buildTapes(three, template, tracks, content, mono);
  const UP = new three.Vector3(0, 1, 0);
  const yawQ = (yaw: number) => slotQ.clone().premultiply(new three.Quaternion().setFromAxisAngle(UP, yaw));
  const tsize = new three.Box3().setFromObject(template).getSize(new three.Vector3());
  const radius = (tsize.x + tsize.z) / 4.2;
  const bounds: Bounds = { minX: -1.55 * W, maxX: 1.45 * W, minZ: -1.05 * D, maxZ: 1.4 * D };
  const obstacle: Box = { minX: deviceBox.min.x, maxX: deviceBox.max.x, minZ: deviceBox.min.z, maxZ: deviceBox.max.z };
  const recs = new Map<TrackId, Tape>();
  for (const track of tracks) {
    const obj = tapes.get(track.id);
    if (!obj) continue;
    obj.quaternion.copy(slotQ);
    obj.updateMatrixWorld(true);
    const lift = groundY - new three.Box3().setFromObject(obj).min.y;
    const [sx, sz, yaw] = SCATTER[track.number - 1];
    const hubs = ["HubLPivot", "HubRPivot"].map((n) => obj.getObjectByName(n)).filter((h): h is THREE.Object3D => !!h);
    recs.set(track.id, { id: track.id, track, obj, lift, hubs, body: { x: sx * W, z: sz * D, yaw, vx: 0, vz: 0, va: 0 }, hover: { y: 0 }, mix: { k: 0 }, mode: "free", seated: false, tl: null, alpha: { k: 1 }, mats: [] });
    scene.add(obj);
  }
  // Each tape's own copies of its materials, so it can fade alone (reduced motion's
  // cross-fade, deskMotion), the rest of the desk untouched.
  const fadeMats: THREE.Material[] = [];
  for (const t of recs.values()) {
    const copies = new Map<THREE.Material, THREE.Material>();
    const own = (m: THREE.Material) => {
      let c = copies.get(m);
      if (!c) {
        c = m.clone();
        c.userData.opacity = m.opacity;
        c.userData.transparent = m.transparent;
        copies.set(m, c);
      }
      return c;
    };
    t.obj.traverse((x) => {
      const mesh = x as THREE.Mesh;
      if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
    });
    t.mats = [...copies.values()];
    fadeMats.push(...t.mats);
  }
  const all = [...recs.values()];
  // What lights at night: the plate's print, and the tapes' printed labels (their copies).
  const legends = nameInk ? [...keyLabels.materials, nameInk] : keyLabels.materials;
  const printed = fadeMats.filter((m) => m.userData.printed);
  const freeTapes = () => all.filter((t) => t.mode === "free");
  // Any overlap in the scatter settles before the first frame.
  for (let n = 0; n < 90; n++) stepDesk(freeTapes().map((t) => t.body), 1 / 60, { radius, bounds, obstacle });
  const homeY = (t: Tape) => groundY + t.lift;
  const settle = (t: Tape) => {
    t.obj.position.set(t.body.x, homeY(t) + t.hover.y, t.body.z);
    t.obj.quaternion.copy(yawQ(t.body.yaw));
  };
  all.forEach(settle);

  // The lamp: a warm pool that follows the pointer on the desk at night.
  const spot = new three.SpotLight("#ffd29a", 0, 80, 0.42, 0.85, 1.1);
  spot.castShadow = true;
  spot.shadow.mapSize.setScalar(1024);
  spot.shadow.bias = -0.0005;
  const lampAt = new three.Vector3(-W * 0.2, groundY, 0.6);
  spot.target.position.copy(lampAt);
  scene.add(spot, spot.target);
  let night = false;

  const camera = new three.PerspectiveCamera(28, 1, 0.1, 200);
  const frame = deskFraming(three, el, camera, { deskX: -W * 0.22, playerX: device.position.x });

  // ---------- the scene's GSAP ----------
  // Every tween the scene starts belongs to one context that dispose() reverts. Tweens start
  // later (a route change, the pointer, the handle), so each entry point runs inside the
  // context (scoped), and a tween's own callbacks run in its context too (a seat's LED and
  // clunk dip, the loading counter). Finished tweens are dropped from it now and then, so a
  // long visit doesn't keep every hover's tween.
  const ctx = gsap.context(() => {});
  const running = (a: gsap.core.Animation) => {
    let top = a;
    while (top.parent) top = top.parent;
    return top === gsap.globalTimeline;
  };
  const scoped =
    <A extends unknown[], R>(f: (...a: A) => R) =>
    (...a: A): R => {
      if (ctx.data.length > 200) ctx.data = (ctx.data as gsap.core.Animation[]).filter(running);
      let r!: R;
      ctx.add(() => {
        r = f(...a);
      });
      return r;
    };
  const scopedAll = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "function" ? scoped(v as (...a: unknown[]) => unknown) : v])) as T;

  // ---------- the screen and the LED ----------
  let want: TrackId | null = null; // the tape in, or going in
  let applied: { state: DeskState; want: TrackId | null } | null = null;
  let hovered: TrackId | null = null;
  let override: { lines: Lines; progress?: number } | null = null;
  let loading: gsap.core.Tween | null = null;
  const nn = (t: Tape) => formatTrackNumber(t.track.number);
  const refreshScreen = () => {
    const t = want ? recs.get(want) : null;
    if (t) {
      if (loading?.isActive()) return;
      if (!t.seated) return screenApi.show([`CUE ${nn(t)}`, t.track.label]);
      if (override) return screenApi.show(override.lines, override.progress);
      return screenApi.show([`${nn(t)} ${t.track.label.toUpperCase()}`, "▶ PLAYING"]);
    }
    const h = hovered ? recs.get(hovered) : null;
    if (h) return screenApi.show([`CUE ${nn(h)}`, h.track.label]);
    // The desk's own lines (the desk writes them on `/`), else the player's.
    if (override) return screenApi.show(override.lines, override.progress);
    screenApi.show(["NO TAPE", "PICK A TAPE"]);
  };
  const led = (on: boolean) => gsap.to(ledMat, { emissiveIntensity: on ? 2.5 : 0, duration: still ? 0 : 0.2, overwrite: true });

  // ---------- the tapes' moves ----------
  const seat = (t: Tape, kind: InsertKind | "instant") => {
    t.seated = true;
    t.obj.position.copy(slotP);
    t.obj.quaternion.copy(slotQ);
    markInserted();
    led(true);
    if (kind !== "instant") {
      playClunk(); // the same frame as the drop
      if (!still) {
        gsap.fromTo(device.position, { y: -DIP }, { y: 0, duration: 0.35, ease: "power2.out", overwrite: true });
        gsap.fromTo(t.obj.position, { y: slotP.y - DIP }, { y: slotP.y, duration: 0.35, ease: "power2.out" });
      }
      hooks.onInsert(t.id);
    }
    if (kind === "full" && !still) {
      const count = { n: 0 };
      loading = gsap.to(count, {
        n: 120,
        duration: TIMING.load,
        ease: "none",
        onUpdate: () => screenApi.show(["LOADING", `▶▶ ${String(Math.round(count.n / 8) * 8).padStart(3, "0")}`], undefined, true),
        onComplete: () => {
          loading = null;
          refreshScreen();
        },
      });
    }
    refreshScreen();
  };
  const motion = tapeMotion({
    three,
    camera,
    slotP,
    slotQ,
    aboveY: slotP.y + size.y * LIFT,
    homeY,
    yawQ,
    still: () => still,
    deck: () => applied?.state === "deck",
    onSeat: seat,
    onInspect: hooks.onInspect,
  });

  // ---------- following the route ----------
  const sync = (state: DeskState, current: TrackId | null, initial = false) => {
    const next = state === "deck" && current && recs.has(current) ? current : null;
    if (applied && applied.state === state && applied.want === next) return;
    const from = applied;
    applied = { state, want: next };
    want = next;
    if (from && from.want !== next) override = null;
    loading?.kill();
    loading = null;
    if (motion.held()?.id === next) motion.release();
    else motion.putBack();
    if (grabbed && grabbed.id === next) grabbed = null;
    gsap.killTweensOf(frame.mode);

    if (initial) {
      // A direct load: the tape is already in, the view already where it rests.
      const t = next ? recs.get(next) : null;
      if (t) {
        motion.kill(t);
        t.mode = "in";
        seat(t, "instant");
      } else led(false);
      frame.mode.k = state === "deck" ? 1 : 0;
      frame.applyBox();
      refreshScreen();
      return;
    }

    let leaving = false; // a tape coming out of the slot: the next waits a beat for it
    for (const t of all) {
      if (t.id === next || t.mode !== "in") continue;
      leaving ||= t.seated || t.obj.position.distanceTo(slotP) < size.y * LIFT;
      motion.eject(t);
    }
    const full = !from?.want && isFirstInsert();
    const t = next ? recs.get(next) : null;
    if (t && t.mode !== "in") motion.insert(t, full ? "full" : "switch", leaving && !still ? SWITCH.gap : 0);
    if (!t) led(false);
    const toDeck = state === "deck";
    if (still) {
      // The view jumps to where it rests.
      frame.mode.k = toDeck ? 1 : 0;
      frame.applyBox();
      refreshScreen();
      return;
    }
    // The first insert of a visit loads before the view eases back into the corner.
    const delay = toDeck && t && full ? TIMING.fly + TIMING.drop + TIMING.load : 0;
    const duration = toDeck ? (full ? TIMING.unfold : SWITCH.box) : EJECT.box;
    gsap.to(frame.mode, { k: toDeck ? 1 : 0, duration, delay, ease: "power3.inOut", onUpdate: frame.applyBox });
    refreshScreen();
  };

  // ---------- the pointer's side ----------
  const ndc = new three.Vector2();
  const ray = new three.Raycaster();
  const aimRay = (x: number, y: number) => {
    const r = el.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const plane = new three.Plane(UP.clone(), 0);
  const deskPoint = (x: number, y: number, h: number) => {
    aimRay(x, y);
    plane.constant = -(groundY + h);
    return ray.ray.intersectPlane(plane, new three.Vector3());
  };
  const objs = all.map((t) => t.obj);
  const hoverH = tsize.y * 2.2;
  const holdH = tsize.y * 3;
  let grabbed: Tape | null = null;
  let nudging: { t: Tape; tl: gsap.core.Timeline } | null = null;
  let samples: { x: number; z: number; t: number }[] = [];
  let grabOffset = { dx: 0, dz: 0 };
  const setHover = (id: TrackId | null) => {
    if (id === hovered) return;
    const prev = hovered ? recs.get(hovered) : null;
    if (prev && prev.mode === "free" && prev !== grabbed) motion.raise(prev, false, hoverH);
    hovered = id;
    const t = id ? recs.get(id) : null;
    if (t && t.mode === "free") motion.raise(t, true, hoverH);
    refreshScreen();
    hooks.onHover?.(id);
  };
  const pointer: PointerScene = {
    el,
    pickTape(x, y) {
      aimRay(x, y);
      let hit: THREE.Object3D | null | undefined = ray.intersectObjects(objs, true)[0]?.object;
      while (hit && !objs.includes(hit)) hit = hit.parent;
      const t = all.find((r) => r.obj === hit);
      return t && t.mode !== "inspect" && !t.seated ? t.id : null;
    },
    overPlayer(x, y) {
      aimRay(x, y);
      return ray.intersectObject(device, true).length > 0;
    },
    hover: setHover,
    grab(id, x, y) {
      const t = recs.get(id);
      const hit = t?.mode === "free" ? deskPoint(x, y, tsize.y * 2) : null;
      if (!t || !hit) return;
      grabbed = t;
      grabOffset = { dx: t.body.x - hit.x, dz: t.body.z - hit.z };
      t.body.vx = t.body.vz = t.body.va = 0;
      samples = [];
    },
    dragTo(x, y) {
      if (grabbed?.mode !== "free") return;
      const hit = deskPoint(x, y, tsize.y * 2);
      if (!hit) return;
      grabbed.body.x = hit.x + grabOffset.dx;
      grabbed.body.z = hit.z + grabOffset.dz;
      samples.push({ x: grabbed.body.x, z: grabbed.body.z, t: performance.now() });
      if (samples.length > 16) samples.shift();
      if (grabbed.hover.y < holdH - 1e-3 && !gsap.isTweening(grabbed.hover)) motion.raise(grabbed, true, holdH);
    },
    release(at) {
      const t = grabbed;
      grabbed = null;
      if (t?.mode !== "free") return;
      // Thrown with the release velocity; still, it stays where it is let go.
      const { vx, vz } = still ? { vx: 0, vz: 0 } : releaseVelocity(samples, at);
      samples = [];
      t.body.vx = vx;
      t.body.vz = vz;
      t.body.va = (Math.random() - 0.5) * Math.min(14, Math.hypot(vx, vz) * 0.7);
      motion.raise(t, hovered === t.id, hoverH);
    },
    inspecting: () => motion.held()?.id ?? null,
    beginTurn: motion.beginTurn,
    turnInspect: motion.turnBy,
    inspect(id) {
      if (!id) return motion.putBack();
      const t = recs.get(id);
      if (!t || t.mode !== "free" || applied?.state !== "desk") return;
      if (hovered) setHover(null);
      if (grabbed === t) grabbed = null;
      motion.inspect(t);
    },
    putBack: motion.putBack,
    turnKnob(steps) {
      knobTo -= steps * DETENT;
      gsap.to(mark.rotation, { y: knobTo, duration: still ? 0 : 0.3, ease: "back.out(2)", overwrite: true });
    },
    aimLamp(x, y) {
      if (!night) return;
      const p = deskPoint(x, y, 0);
      if (p) lampAt.copy(p);
    },
  };

  // ---------- every frame ----------
  const view: View = {
    el,
    scene,
    camera,
    fail: hooks.fail,
    frame(dt) {
      frame.aim(el.getBoundingClientRect());
      const free = freeTapes();
      if (free.length) {
        const held = grabbed ? free.indexOf(grabbed) : -1;
        stepDesk(free.map((t) => t.body), Math.min(dt, 1 / 30), { radius, bounds, obstacle, held: held >= 0 ? held : undefined });
        // Still, a tape pushed aside by the one in hand moves only as far as it is pushed.
        if (still) free.forEach(({ body }) => void (body.vx = body.vz = body.va = 0));
        free.forEach(settle);
      }
      motion.turnHeld();
      const playing = want ? recs.get(want) : null;
      if (playing?.seated && !still) playing.hubs.forEach((h) => (h.rotation.y -= dt * 3));
      // The pool eases after the pointer; still (reduced motion), it is where the pointer is.
      if (still) spot.target.position.copy(lampAt);
      else spot.target.position.lerp(lampAt, 0.15);
      spot.position.set(spot.target.position.x - 3, groundY + 16, spot.target.position.z + 5);
      screenApi.tick(dt);
      scene.updateMatrixWorld();
      hooks.onFrame?.();
    },
  };

  frame.applyBox();
  frame.aim(el.getBoundingClientRect());
  ctx.add(refreshScreen);

  const box = new three.Box3();
  let disposed = false;
  const api = {
    ...pointer,
    sync,
    project(id: ProjectId) {
      if (id === "player") return frame.box(box.setFromObject(device));
      if (id.startsWith("key")) {
        const k = device.getObjectByName(`Key${id.slice(3)}`);
        return k ? frame.box(box.setFromObject(k), true) : null;
      }
      const t = recs.get(id as TrackId);
      return t ? frame.box(box.setFromObject(t.obj)) : null;
    },
    screen(lines: Lines, progress?: number) {
      override = { lines, progress };
      refreshScreen();
    },
    screenText: () => screenApi.text(),
    screenHeadline: () => screenApi.headline(),
    led,
    slotOnScreen: () => frame.point(slotP),
    wiggle() {
      if (still) return;
      gsap
        .timeline()
        .to(mark.rotation, { y: knobTo - 0.35, duration: 0.14, ease: "power2.out" })
        .to(mark.rotation, { y: knobTo + 0.2, duration: 0.16, ease: "power2.inOut" })
        .to(mark.rotation, { y: knobTo, duration: 0.3, ease: "back.out(2)" });
    },
    nudge(id: TrackId): boolean {
      const t = recs.get(id);
      if (still || !t || t.mode !== "free" || t === grabbed || hovered === id || motion.held() || applied?.state !== "desk") return false;
      // A small hop off the desk and back down onto it, a touch of bounce as it lands. A hover
      // (motion.raise overwrites the tween) or a grab takes the tape over at once.
      const tl = gsap
        .timeline({ onComplete: () => void (nudging = null) })
        .to(t.hover, { y: hoverH * 0.7, duration: 0.24, ease: "power2.out" })
        .to(t.hover, { y: 0, duration: 0.6, ease: "bounce.out" });
      nudging = { t, tl };
      return true;
    },
    calm() {
      if (!nudging) return;
      const { t, tl } = nudging;
      nudging = null;
      if (!tl.isActive()) return;
      tl.kill();
      if (hovered !== t.id && grabbed !== t) gsap.to(t.hover, { y: 0, duration: 0.2, ease: "power2.out", overwrite: true });
    },
    setNight(on: boolean, instant = false) {
      night = on;
      const duration = instant || still ? 0 : 0.3;
      const to = (target: gsap.TweenTarget, vars: gsap.TweenVars) => gsap.to(target, { ...vars, duration, overwrite: true });
      to(light, { intensity: on ? NIGHT.key : DAY.key });
      to(ambient, { intensity: on ? NIGHT.ambient : DAY.ambient });
      to(scene, { environmentIntensity: on ? NIGHT.environment : DAY.environment });
      to(spot, { intensity: on ? NIGHT.lamp : 0 });
      to(legends, { emissiveIntensity: on ? NIGHT.legend : 0 });
      to(printed, { emissiveIntensity: on ? NIGHT.print : 0 });
    },
    setStill(on: boolean) {
      if (on === still) return;
      still = on;
      screenApi.setStill(on);
      if (!on) return;
      api.calm();
      for (const t of all) t.body.vx = t.body.vz = t.body.va = 0;
      // Every move started (running or waiting), at its end, callbacks and all: a tape on its
      // way to the slot seats, the view reaches its box, the screen its lines.
      const moves = (ctx.data as gsap.core.Animation[]).filter((a) => a.parent === gsap.globalTimeline && a.progress() < 1);
      moves.forEach((a) => a.progress(1));
    },
    seatedId: () => all.find((t) => t.seated)?.id ?? null,
    printSwatch(id: `key${number}` | TrackId, mode: Swatch | null) {
      if (id.startsWith("key")) return keyLabels.swatch(Number(id.slice(3)), mode);
      const t = recs.get(id as TrackId);
      if (t) tapeSwatch(t.obj, mode);
    },
    printQuad(id: `key${number}` | TrackId) {
      const key = id.startsWith("key");
      const mesh = key ? keyLabels.meshes[Number(id.slice(3))] : recs.get(id as TrackId)?.obj.getObjectByName("PrintedLabel");
      if (!mesh) return null;
      const { left, right, top, bottom } = SUB_LINE;
      const [w, h] = [PLANE_W / 2, PLANE_H / 2];
      const corners: [number, number][] = key
        ? [[-w, h], [w, h], [w, -h], [-w, -h]]
        : [labelPoint(left, top), labelPoint(right, top), labelPoint(right, bottom), labelPoint(left, bottom)];
      mesh.updateWorldMatrix(true, false);
      return corners.map(([x, y]) => frame.point(mesh.localToWorld(new three.Vector3(x, y, 0))));
    },
  };
  return {
    ...scopedAll(api),
    view,
    dispose() {
      if (disposed) return;
      disposed = true;
      // Every tween the scene started, running or waiting; without their callbacks (no clunk,
      // ripple or box write while it is taken down).
      ctx.revert({ suppressEvents: true });
      frame.dispose();
      screenApi.dispose();
      disposeTapes(tapes);
      keyLabels.dispose();
      nameInk?.dispose();
      ledMat.dispose();
      fadeMats.forEach((m) => m.dispose());
      spot.dispose();
      disposeTable();
    },
  };
}
