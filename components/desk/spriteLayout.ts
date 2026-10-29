import type { CSSProperties } from "react";
import { DEVICE } from "@/lib/device/layout";
import { SCATTER } from "@/lib/desk/physics";

/*
 * The desk laid out flat, top down, for where there is no 3D (and for the links before the
 * 3D's first frame). Lengths are in units of the player's plate (`--u` on the desk, `--cw`
 * in the deck's corner, both set in overlays.module.css), so it scales as one object. The
 * scene's own layout, flattened: the player right of centre, the tapes at SCATTER.
 */

/** The plate's height over its width. */
export const PLATE_RATIO = DEVICE.plate.height / DEVICE.plate.width;

// The 3D centres the desk a little left of the player (deskFraming: -0.22 W) and the scatter
// reaches lower than the player, so the drawing sits a touch high to keep both on screen.
const DESK_X = 0.22;
const DESK_Z = 0.12;

const { cassette } = DEVICE;
const TAPE_W = cassette.w;
const TAPE_H = cassette.h * PLATE_RATIO;

const n = (v: number) => +v.toFixed(4);

type Vars = CSSProperties & Record<`--${string}`, string>;

/** A box centred on (x, y), at least 44 px each way: `--left`, `--top`, `--width`, `--height`. */
const box = (x: string, y: string, w: string, h: string): Vars => ({
  "--left": x,
  "--top": y,
  "--width": `max(44px, ${w})`,
  "--height": `max(44px, ${h})`,
});

/** Where the tape numbered `number` lies on the desk, turned as SCATTER has it. */
export function tapeOnDesk(number: number): Vars {
  const [sx, sz, yaw] = SCATTER[number - 1];
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const u = (k: number) => `calc(${n(k)} * var(--u))`;
  return {
    ...box(`calc(50% + ${n(sx + DESK_X)} * var(--u))`, `calc(50% + ${n(sz * PLATE_RATIO - DESK_Z)} * var(--u))`, u(TAPE_W * c + TAPE_H * s), u(TAPE_W * s + TAPE_H * c)),
    "--tape": u(TAPE_W),
    // three's yaw turns anticlockwise seen from above; CSS turns clockwise.
    "--turn": `${n(-yaw)}rad`,
  };
}

/** The tape in the slot of the corner player (the deck). */
export function tapeInDeck(): Vars {
  const cw = (k: number) => `calc(${n(k)} * var(--cw))`;
  const cx = cassette.x + cassette.w / 2;
  const cy = (cassette.y + cassette.h / 2) * PLATE_RATIO;
  return {
    ...box(`calc(18px + ${n(cx)} * var(--cw))`, `calc(100% - 18px - ${n(PLATE_RATIO)} * var(--cw) + ${n(cy)} * var(--cw))`, cw(TAPE_W), cw(TAPE_H)),
    "--tape": cw(TAPE_W),
    "--turn": "0rad",
  };
}

/** Key `index` on the plate (`--pw`, the plate's width wherever it is). */
export function keyOnPlate(index: number): Vars {
  const k = DEVICE.keys[index];
  const pw = (v: number) => `calc(${n(v)} * var(--pw))`;
  return {
    ...box(pw(k.x + k.w / 2), pw((k.y + k.h / 2) * PLATE_RATIO), pw(k.w), pw(k.h * PLATE_RATIO)),
    "--cap-w": pw(k.w),
    "--cap-h": pw(k.h * PLATE_RATIO),
  };
}
