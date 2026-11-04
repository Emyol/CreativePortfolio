import { describe, expect, it } from "vitest";
import { deviceLayout, sectionDeviceSchema, type DeviceId } from "./layout";

describe("deviceLayout", () => {
  it("parses the events device's layout", () => {
    const l = deviceLayout("events");
    expect(l.size.width).toBeGreaterThan(0);
    expect(l.size.height).toBeGreaterThan(0);
    // No rendered body yet: the frame draws its stand-in bezel.
    expect(l.art).toBe(false);
    expect(l.screen.x + l.screen.w).toBeLessThanOrEqual(1);
    expect(l.screen.y + l.screen.h).toBeLessThanOrEqual(1);
    expect(l.keys).toEqual({});
  });

  it("defaults art and keys, and refuses a screen that leaves the body", () => {
    const base = { size: { width: 100, height: 50 }, screen: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } };
    expect(sectionDeviceSchema.parse(base)).toMatchObject({ art: false, keys: {} });
    expect(() => sectionDeviceSchema.parse({ ...base, screen: { x: 0.5, y: 0.1, w: 0.8, h: 0.8 } })).toThrow();
  });

  it("knows only the devices that have a layout: one without is not a DeviceId", () => {
    const ids: DeviceId[] = ["events"];
    expect(ids.map((id) => deviceLayout(id).size.width > 0)).toEqual([true]);
    // @ts-expect-error -- About has no device layout yet, so a frame for it does not compile.
    const about: DeviceId = "about";
    expect(about).toBe("about");
  });
});
