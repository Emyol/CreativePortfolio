import { z } from "zod";
import events from "@/public/devices/events/layout.json";

// Where a section device's live parts sit on its rendered body (public/devices/<id>/), as
// fractions of the body image (x of its width, y of its height, from the top left), as the
// player's own layout does (lib/device/layout.ts, a different shape). Only Events has a
// layout so far; it holds stand-in values with `art: false`, and DeviceFrame draws a CSS
// bezel until its body is rendered.
const unit = z.number().min(0).max(1);
const rect = z
  .object({ x: unit, y: unit, w: unit, h: unit })
  .refine((r) => r.x + r.w <= 1 && r.y + r.h <= 1, "a rect must stay inside the body");

export const sectionDeviceSchema = z.object({
  size: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  /** The body is rendered (`body.avif` and `body.webp` beside the layout); false: a CSS stand-in. */
  art: z.boolean().default(false),
  screen: rect,
  keys: z.record(z.string(), rect).default({}),
});

export type SectionDevice = z.infer<typeof sectionDeviceSchema>;

// Each device's layout joins here as its device is built, and only then is its id a
// DeviceId: a frame for a device with no layout does not compile.
const SOURCES = { events } as const;
export type DeviceId = keyof typeof SOURCES;
const parsed = new Map<DeviceId, SectionDevice>();

export function deviceLayout(id: DeviceId): SectionDevice {
  let layout = parsed.get(id);
  if (!layout) {
    layout = sectionDeviceSchema.parse(SOURCES[id]);
    parsed.set(id, layout);
  }
  return layout;
}
