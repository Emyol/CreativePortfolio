import { describe, expect, it } from "vitest";
import { deviceLayout, deviceLayoutSchema } from "./layout";

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
    expect(deviceLayoutSchema.parse(base)).toMatchObject({ art: false, keys: {} });
    expect(() => deviceLayoutSchema.parse({ ...base, screen: { x: 0.5, y: 0.1, w: 0.8, h: 0.8 } })).toThrow();
  });

  it("names the device that has no layout yet", () => {
    expect(() => deviceLayout("about")).toThrow(/about/);
  });
});
