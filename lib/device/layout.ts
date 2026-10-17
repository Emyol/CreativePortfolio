import { z } from "zod";
import json from "@/public/device/layout.json";

// Anchor points of the rendered device, written by art/blender/side-a/device.py. Points and
// rects are fractions of the plate canvas (x of its width, y of its height, from the top
// left); sizes (hub, pack, knob) are fractions of its width. Every layer is positioned with
// these, so the device scales with its container.
const unit = z.number().min(0).max(1);
const pt = z.object({ x: unit, y: unit });
const rect = z.object({ x: unit, y: unit, w: unit, h: unit });
const size = z.object({ width: z.number().int().positive(), height: z.number().int().positive() });

export const deviceLayoutSchema = z.object({
  plate: size,
  cassette: rect,
  reels: z.object({ left: pt, right: pt, hub: unit }),
  pack: z.object({ min: unit, max: unit }),
  knob: z.object({ centre: pt, size: unit, sprite: unit }),
  keys: z.tuple([rect, rect, rect, rect]),
  keyPad: pt,
  keyLabels: z.tuple([rect, rect, rect, rect]),
  screen: rect,
  window: rect,
  nameplate: rect,
  led: pt,
  underside: size.extend({ sticker: rect }),
  flipFrames: z.number().int().positive(),
  flipSize: size,
});

export type DeviceLayout = z.infer<typeof deviceLayoutSchema>;
export type Rect = z.infer<typeof rect>;
export type Pt = z.infer<typeof pt>;

export const DEVICE: DeviceLayout = deviceLayoutSchema.parse(json);

export const pct = (n: number): string => `${+(n * 100).toFixed(4)}%`;
