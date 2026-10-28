import type * as THREE from "three";
import type { Body } from "@/lib/desk/physics";
import { TIMING } from "@/lib/desk/timing";
import { gsap } from "@/lib/motion/gsap";
import type { Track, TrackId } from "@/lib/tape";

/** What a tape is doing: on the desk (physics), going into or sitting in the slot, going home, held up. */
export type TapeMode = "free" | "in" | "out" | "inspect";
export type Tape = {
  id: TrackId;
  track: Track;
  obj: THREE.Object3D;
  body: Body;
  /** How far its origin sits above the desk when lying flat. */
  lift: number;
  hover: { y: number };
  mix: { k: number };
  mode: TapeMode;
  seated: boolean;
  tl: gsap.core.Timeline | null;
  hubs: THREE.Object3D[];
};
export type InsertKind = "full" | "switch";

/** A later switch: the old tape lifts out as the new one drops in, all within TIMING.switchMax. */
export const SWITCH = { out: 0.25, home: 0.5, fly: 0.4, drop: 0.2, gap: 0.15, box: 0.6 };
export const EJECT = { lift: 0.3, home: 0.55, box: 0.8 };

/**
 * The tapes' moves between the desk, the slot and the hand. Every move first kills what is
 * moving the tape and starts from where it is, so a new route mid-flight retargets smoothly.
 */
export function tapeMotion(o: {
  three: typeof THREE;
  camera: THREE.PerspectiveCamera;
  slotP: THREE.Vector3;
  slotQ: THREE.Quaternion;
  /** The height a tape flies at over the slot. */
  aboveY: number;
  homeY(t: Tape): number;
  yawQ(yaw: number): THREE.Quaternion;
  still: boolean;
  /** Whether the desk is in the deck state now (a switch, not an eject, times the lift out). */
  deck(): boolean;
  onSeat(t: Tape, kind: InsertKind): void;
  onInspect(id: TrackId | null): void;
}) {
  const { three, camera, slotP, slotQ } = o;
  let inspecting: Tape | null = null;
  let inspectBase: THREE.Quaternion | null = null;
  const turn = { yaw: 0, pitch: 0, from: { yaw: 0, pitch: 0 } };

  const kill = (t: Tape) => {
    t.tl?.kill();
    t.tl = null;
    gsap.killTweensOf([t.obj.position, t.mix, t.hover]);
  };
  const raise = (t: Tape, on: boolean, h: number) => gsap.to(t.hover, { y: on ? h : 0, duration: 0.35, ease: "power3.out", overwrite: true });
  const turnTo = (t: Tape, to: THREE.Quaternion, duration: number, ease: string) => {
    const q0 = t.obj.quaternion.clone();
    t.mix.k = 0;
    return gsap.to(t.mix, { k: 1, duration, ease, onUpdate: () => void t.obj.quaternion.slerpQuaternions(q0, to, t.mix.k) });
  };
  const home = (t: Tape, duration: number, ease: string) =>
    gsap
      .timeline()
      .to(t.obj.position, { x: t.body.x, y: o.homeY(t), z: t.body.z, duration, ease })
      .add(turnTo(t, o.yawQ(t.body.yaw), duration, ease), 0);
  const freed = (t: Tape) => () => {
    t.mode = "free";
    t.tl = null;
  };

  const insert = (t: Tape, kind: InsertKind, delay: number) => {
    kill(t);
    t.mode = "in";
    t.seated = false;
    t.hover.y = 0;
    const fly = kind === "full" ? TIMING.fly : SWITCH.fly;
    const drop = kind === "full" ? TIMING.drop : SWITCH.drop;
    t.tl = gsap
      .timeline({ delay })
      .to(t.obj.position, { x: slotP.x, y: o.aboveY, z: slotP.z, duration: fly, ease: "power2.inOut" })
      .add(turnTo(t, slotQ, fly, "power2.inOut"), 0)
      .to(t.obj.position, { y: slotP.y, duration: drop, ease: "power3.in" })
      .call(() => o.onSeat(t, kind));
  };

  const eject = (t: Tape) => {
    kill(t);
    t.mode = "out";
    t.seated = false;
    const { out, back } = o.deck() ? { out: SWITCH.out, back: SWITCH.home } : { out: EJECT.lift, back: EJECT.home };
    t.tl = gsap
      .timeline()
      .to(t.obj.position, { y: Math.max(o.aboveY, t.obj.position.y), duration: out, ease: "power2.out" })
      .add(home(t, back, "power3.inOut"))
      .call(freed(t));
  };

  const putBack = () => {
    const t = inspecting;
    if (!t) return;
    inspecting = null;
    inspectBase = null;
    kill(t);
    t.mode = "out";
    t.tl = gsap.timeline().add(home(t, 0.55, "power3.inOut")).call(freed(t));
    o.onInspect(null);
  };

  /** Lifts `t` up to the camera to be turned over in the hand. */
  const inspect = (t: Tape) => {
    if (inspecting) putBack();
    kill(t);
    t.mode = "inspect";
    t.hover.y = 0;
    inspecting = t;
    turn.yaw = turn.pitch = 0;
    const dir = camera.getWorldDirection(new three.Vector3());
    const p = camera.position.clone().add(dir.multiplyScalar(12));
    const toCam = camera.position.clone().sub(p).normalize();
    const base = new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), toCam).multiply(slotQ);
    t.tl = gsap
      .timeline()
      .to(t.obj.position, { x: p.x, y: p.y, z: p.z, duration: 0.6, ease: "power3.out" })
      .add(turnTo(t, base, 0.6, "power3.out"), 0)
      .call(() => {
        inspectBase = base;
        t.tl = null;
      });
    o.onInspect(t.id);
  };

  /** The held tape is the one being loaded: it goes from the hand into the slot. */
  const release = () => {
    if (!inspecting) return;
    inspecting = null;
    inspectBase = null;
    o.onInspect(null);
  };

  const turnQ = new three.Quaternion();
  const qa = new three.Quaternion();
  const qb = new three.Quaternion();
  const right = new three.Vector3();
  const camUp = new three.Vector3();
  const back = new three.Vector3();
  /** Each frame: the held tape follows the drag's turn. */
  const turnHeld = () => {
    if (!inspecting || !inspectBase) return;
    camera.matrixWorld.extractBasis(right, camUp, back);
    qa.setFromAxisAngle(camUp, turn.yaw);
    qb.setFromAxisAngle(right, turn.pitch);
    turnQ.copy(qa).multiply(qb).multiply(inspectBase);
    inspecting.obj.quaternion.slerp(turnQ, o.still ? 1 : 0.2);
  };

  return {
    kill,
    raise,
    insert,
    eject,
    inspect,
    putBack,
    release,
    turnHeld,
    held: () => inspecting,
    beginTurn() {
      turn.from = { yaw: turn.yaw, pitch: turn.pitch };
    },
    turnBy(dx: number, dy: number) {
      turn.yaw = turn.from.yaw + dx * 0.012;
      turn.pitch = turn.from.pitch + dy * 0.012;
    },
  };
}
