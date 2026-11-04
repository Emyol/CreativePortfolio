import * as THREE from "three";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TIMING } from "@/lib/desk/timing";
import { gsap } from "@/lib/motion/gsap";
import { TRACK_ORDER, type TrackId } from "@/lib/tape";
import { FADE, SWITCH, tapeMotion, type Tape } from "./deskMotion";

// The tapes' moves retarget mid-flight (Review Focus 1: rapid input during a transition):
// every move kills what is moving the tape and starts from where it is, so the last request
// wins, a tape seats only when its own insert finishes, and an ejected one ends free at home.
// GSAP's clock is stepped by hand (the ticker no longer drives the root timeline), so a move
// that was not killed would carry on and show itself.

const SLOT = new THREE.Vector3(6, 0.5, 4);
const HOME_Y = 0.12;

function tape(id: TrackId, x: number, z: number): Tape {
  const track = { ...TRACK_ORDER.find((t) => t.id === id)!, number: 1 };
  const t: Tape = {
    id,
    track,
    obj: new THREE.Object3D(),
    body: { x, z, yaw: 0.3, vx: 0, vz: 0, va: 0 },
    lift: HOME_Y,
    hover: { y: 0 },
    mix: { k: 0 },
    mode: "free",
    seated: false,
    tl: null,
    hubs: [],
    alpha: { k: 1 },
    mats: [],
  };
  t.obj.position.set(x, HOME_Y, z);
  return t;
}

let still = false;
let seats: TrackId[] = [];
const motion = () =>
  tapeMotion({
    three: THREE,
    camera: new THREE.PerspectiveCamera(),
    slotP: SLOT,
    slotQ: new THREE.Quaternion(),
    aboveY: 3,
    homeY: () => HOME_Y,
    yawQ: (yaw) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    still: () => still,
    deck: () => true,
    onSeat: (t) => {
      t.seated = true;
      seats.push(t.id);
    },
    onInspect: () => {},
  });

let clock = 0;
/** Moves GSAP's clock on by `s` seconds, in frames, as the ticker would. */
const step = (s: number) => {
  for (let left = s; left > 0; left -= 1 / 60) {
    clock += Math.min(1 / 60, left);
    gsap.updateRoot(clock);
  }
};
const at = (t: Tape) => t.obj.position.toArray().map((v) => Number(v.toFixed(4)));
const home = (t: Tape) => [t.body.x, HOME_Y, t.body.z];
const LONG = 3; // past any move's end

beforeAll(() => {
  gsap.ticker.remove(gsap.updateRoot);
  clock = gsap.ticker.time;
});
afterAll(() => gsap.ticker.add(gsap.updateRoot));
beforeEach(() => {
  still = false;
  seats = [];
});

describe("tapeMotion retargets mid-flight", () => {
  it("an eject mid-insert kills the insert: the tape never seats and ends free at home", () => {
    const m = motion();
    const a = tape("about", -2, 1);
    m.insert(a, "full", 0);
    step(TIMING.fly / 2);
    const mid = at(a);
    expect(mid).not.toEqual(home(a));
    m.eject(a);
    expect(a).toMatchObject({ mode: "out", seated: false });
    step(1 / 60);
    // It goes on from where the insert left it, not from the slot or from home.
    expect(Math.abs(at(a)[0] - mid[0])).toBeLessThan(0.5);
    step(LONG);
    expect(a).toMatchObject({ mode: "free", seated: false, tl: null });
    expect(at(a)).toEqual(home(a));
    expect(seats).toEqual([]);
  });

  it("insert a, then b mid-flight (a switch): b seats once, a goes home free", () => {
    const m = motion();
    const a = tape("about", -2, 1);
    const b = tape("people", -3, -1);
    m.insert(a, "full", 0);
    step(TIMING.fly * 0.4);
    m.eject(a);
    m.insert(b, "switch", SWITCH.gap);
    step(LONG);
    expect(seats).toEqual(["people"]);
    expect(a).toMatchObject({ mode: "free", seated: false });
    expect(at(a)).toEqual(home(a));
    expect(b).toMatchObject({ mode: "in", seated: true });
    expect(at(b)).toEqual(SLOT.toArray());
  });

  it("an insert mid-eject turns the tape back into the slot", () => {
    const m = motion();
    const a = tape("events", -2, 1);
    m.insert(a, "full", 0);
    step(LONG);
    expect(seats).toEqual(["events"]);
    m.eject(a);
    step(0.2);
    m.insert(a, "switch", 0);
    expect(a).toMatchObject({ mode: "in", seated: false });
    step(LONG);
    expect(seats).toEqual(["events", "events"]);
    expect(a).toMatchObject({ mode: "in", seated: true });
    expect(at(a)).toEqual(SLOT.toArray());
  });

  it("kill stops everything moving the tape and shows it whole", () => {
    const m = motion();
    const a = tape("made", 1, 1);
    m.insert(a, "full", 0);
    step(0.2);
    a.alpha.k = 0.4;
    m.kill(a);
    const stopped = at(a);
    expect(a.tl).toBeNull();
    expect(a.alpha.k).toBe(1);
    step(LONG);
    expect(at(a)).toEqual(stopped);
    expect(seats).toEqual([]);
  });

  it("under reduced motion a move is a cross-fade, and one mid-fade retargets too", () => {
    still = true;
    const m = motion();
    const a = tape("mixtape", -2, 1);
    m.insert(a, "full", 0);
    step(FADE.out / 2); // fading out where it lay
    expect(a.alpha.k).toBeLessThan(1);
    m.eject(a);
    expect(a.alpha.k).toBe(1); // the new move starts from a whole tape
    step(LONG);
    expect(a).toMatchObject({ mode: "free", seated: false });
    expect(at(a)).toEqual(home(a));
    expect(a.alpha.k).toBe(1);
    expect(seats).toEqual([]);
  });
});
