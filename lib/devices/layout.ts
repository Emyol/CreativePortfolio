import { z } from "zod";
import events from "@/public/devices/events/layout.json";

// Where a section device's live parts sit on its rendered body (public/devices/<id>/), as
// fractions of the body image (x of its width, y of its height, from the top left), as the
// player's own layout does (lib/device/layout.ts). Until a device is modelled and rendered,
// its layout holds stand-in values with `art: false`, and DeviceFrame draws a CSS bezel.
const unit = z.number().min(0).max(1);
const rect = z
  .object({ x: unit, y: unit, w: unit, h: unit })
  .refine((r) => r.x + r.w <= 1 && r.y + r.h <= 1, "a rect must stay inside the body");

export const deviceLayoutSchema = z.object({
  size: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  /** The body is rendered (`body.avif` and `body.webp` beside the layout); false: a CSS stand-in. */
  art: z.boolean().default(false),
  screen: rect,
  keys: z.record(z.string(), rect).default({}),
});

export type DeviceLayout = z.infer<typeof deviceLayoutSchema>;
export type DeviceId = "events" | "about" | "people" | "made" | "on-rotation" | "mixtape";

// Each device's layout joins here as its device is built.
const SOURCES: Partial<Record<DeviceId, unknown>> = { events };
const parsed = new Map<DeviceId, DeviceLayout>();

export function deviceLayout(id: DeviceId): DeviceLayout {
  let layout = parsed.get(id);
  if (!layout) {
    const source = SOURCES[id];
    if (!source) throw new Error(`The ${id} device has no layout yet (public/devices/${id}/layout.json)`);
    layout = deviceLayoutSchema.parse(source);
    parsed.set(id, layout);
  }
  return layout;
}
