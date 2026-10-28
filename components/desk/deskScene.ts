"use client";
import type * as THREE from "three";
import { buildTapes, disposeTapes } from "@/components/three/tapes";
import { makeTable } from "@/components/three/table";
import type { SiteContent } from "@/lib/content/schema";
import { SCATTER, releaseVelocity, stepDesk, type Bounds, type Box } from "@/lib/desk/physics";
import { TIMING } from "@/lib/desk/timing";
import { isFirstInsert, markInserted } from "@/lib/desk/visit";
import { gsap } from "@/lib/motion/gsap";
import type { MotionTier } from "@/lib/motion/tier";
import { playClunk } from "@/lib/sound";
import { formatTrackNumber, type Track, type TrackId } from "@/lib/tape";
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

export type SceneHooks = {
  onInsert(id: TrackId): void;
  onInspect(id: TrackId | null): void;
  onFrame?(): void;
  fail(): void;
};

export type DeskScene = PointerScene & {
  view: View;
  sync(state: DeskState, current: TrackId | null, initial?: boolean): void;
  project(id: ProjectId): DOMRect | null;
  screen(lines: Lines, progress?: number): void;
  led(on: boolean): void;
  slotOnScreen(): { x: number; y: number };
  wiggle(): void;
  setNight(on: boolean, instant?: boolean): void;
  seatedId(): TrackId | null;
  dispose(): void;
};

/**
 * The desk in 3D (docs/superpowers/specs/2026-10-28-v2-desk-design.md, "The three states"):
 * the player right of centre, the six tapes scattered to its left on a physics desk, a lamp
 * for the night. Drawn by the shared stage into `el`'s box: the whole viewport on the desk,
 * the corner box on the deck (deskFraming). The route drives it through `sync`; the tapes'
 * moves are deskMotion's. Returns null if `dead()` turns true while loading.
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
  ]);
  if (o.dead()) return null;
  const still = tier === "none";

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
    recs.set(track.id, { id: track.id, track, obj, lift, hubs, body: { x: sx * W, z: sz * D, yaw, vx: 0, vz: 0, va: 0 }, hover: { y: 0 }, mix: { k: 0 }, mode: "free", seated: false, tl: null });
    scene.add(obj);
  }
  const all = [...recs.values()];
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
      gsap.fromTo(device.position, { y: -DIP }, { y: 0, duration: 0.35, ease: "power2.out", overwrite: true });
      gsap.fromTo(t.obj.position, { y: slotP.y - DIP }, { y: slotP.y, duration: 0.35, ease: "power2.out" });
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
    still,
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
    if (t && t.mode !== "in") motion.insert(t, full ? "full" : "switch", leaving ? SWITCH.gap : 0);
    if (!t) led(false);
    const toDeck = state === "deck";
    // The first insert of a visit loads before the view eases back into the corner.
    const delay = toDeck && t && full ? TIMING.fly + TIMING.drop + TIMING.load : 0;
    const duration = toDeck ? (full ? TIMING.unfold : SWITCH.box) : EJECT.box;
    gsap.to(frame.mode, { k: toDeck ? 1 : 0, duration: still ? 0 : duration, delay: still ? 0 : delay, ease: "power3.inOut", onUpdate: frame.applyBox });
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
      const { vx, vz } = releaseVelocity(samples, at);
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
        free.forEach(settle);
      }
      motion.turnHeld();
      const playing = want ? recs.get(want) : null;
      if (playing?.seated && !still) playing.hubs.forEach((h) => (h.rotation.y -= dt * 3));
      spot.target.position.lerp(lampAt, 0.15);
      spot.position.set(spot.target.position.x - 3, groundY + 16, spot.target.position.z + 5);
      screenApi.tick(dt);
      scene.updateMatrixWorld();
      hooks.onFrame?.();
    },
  };

  frame.applyBox();
  frame.aim(el.getBoundingClientRect());
  refreshScreen();

  const box = new three.Box3();
  let disposed = false;
  return {
    ...pointer,
    view,
    sync,
    project(id) {
      if (id === "player") return frame.box(box.setFromObject(device));
      if (id.startsWith("key")) {
        const k = device.getObjectByName(`Key${id.slice(3)}`);
        return k ? frame.box(box.setFromObject(k), true) : null;
      }
      const t = recs.get(id as TrackId);
      return t ? frame.box(box.setFromObject(t.obj)) : null;
    },
    screen(lines, progress) {
      override = { lines, progress };
      refreshScreen();
    },
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
    setNight(on, instant = false) {
      night = on;
      const duration = instant || still ? 0 : 0.3;
      gsap.to(light, { intensity: on ? 0.1 : 2.4, duration, overwrite: true });
      gsap.to(ambient, { intensity: on ? 0.04 : 0.35, duration, overwrite: true });
      gsap.to(scene, { environmentIntensity: on ? 0.1 : 0.9, duration, overwrite: true });
      gsap.to(spot, { intensity: on ? 520 : 0, duration, overwrite: true });
    },
    seatedId: () => all.find((t) => t.seated)?.id ?? null,
    dispose() {
      if (disposed) return;
      disposed = true;
      all.forEach(motion.kill);
      loading?.kill();
      gsap.killTweensOf([frame.mode, device.position, ledMat, mark.rotation, light, ambient, scene, spot]);
      frame.dispose();
      screenApi.dispose();
      disposeTapes(tapes);
      ledMat.dispose();
      spot.dispose();
      disposeTable();
    },
  };
}
