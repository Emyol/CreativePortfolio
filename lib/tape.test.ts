import { describe, expect, test } from "vitest";
import { FIXTURES } from "./content/fixtures";
import { parseContent } from "./content/load";
import type { SiteContent } from "./content/schema";
import seed from "./content/seed.json";
import {
  formatTrackNumber,
  hasSide,
  KEY_COUNT,
  keySlots,
  knobAngle,
  neighbours,
  packDiameters,
  shouldHandleTrackKey,
  sideKeySlots,
  sideTrackForKey,
  sideOf,
  sideTracks,
  trackForKey,
  trackNumber,
  visibleTracks,
} from "./tape";

const empty: SiteContent = {
  ...FIXTURES,
  about: { ...FIXTURES.about, letter: [] },
  events: [],
  music: [],
  hobbies: [],
  shelf: [],
  people: [],
};

describe("tracks", () => {
  test("all six tracks in order, numbered across the tape", () => {
    expect(visibleTracks(FIXTURES).map((t) => [t.id, t.side, t.number])).toEqual([
      ["about", "a", 1], ["events", "a", 2], ["mixtape", "a", 3], ["people", "a", 4], ["made", "b", 5], ["on-rotation", "b", 6],
    ]);
  });
  test("labels are the printed key labels", () => {
    expect(visibleTracks(FIXTURES).map((t) => t.label)).toEqual(["about", "events", "mixtape", "people", "made", "on rotation"]);
  });
  test("numbers stay fixed when a track is empty", () => {
    const t = visibleTracks({ ...FIXTURES, music: [] });
    expect(t.find((x) => x.id === "people")?.number).toBe(4);
    expect(t.some((x) => x.id === "mixtape")).toBe(false);
    const c = { ...FIXTURES, events: [], hobbies: [] };
    expect(visibleTracks(c).map((x) => `${x.id}:${x.number}`)).toEqual(["about:1", "mixtape:3", "people:4", "on-rotation:6"]);
    expect(trackNumber("on-rotation")).toBe(6);
    expect(KEY_COUNT).toBe(6);
  });
  test("about needs a letter, not just a toolbox", () => {
    expect(visibleTracks({ ...empty, about: { letter: [], toolbox: ["Git"] } })).toEqual([]);
  });
  test("an empty tape has no tracks, no side b, six blank keys", () => {
    const t = visibleTracks(empty);
    expect(t).toEqual([]);
    expect(hasSide(t, "b")).toBe(false);
    expect(keySlots(t).map((k) => k.track)).toEqual([null, null, null, null, null, null]);
  });
  test("today's seed has no tracks", () => {
    expect(visibleTracks(parseContent(seed, "seed.json"))).toEqual([]);
  });
  test("sides split the tape", () => {
    const t = visibleTracks(FIXTURES);
    expect(sideTracks(t, "b").map((x) => x.id)).toEqual(["made", "on-rotation"]);
    expect(sideOf(t, "made")).toBe("b");
    expect(sideOf(t, "events")).toBe("a");
    expect(sideOf(t, null)).toBe("a");
  });
  test("keySlots has six slots in tape order", () => {
    const t = visibleTracks({ ...FIXTURES, music: [] });
    const slots = keySlots(t);
    expect(slots.map((k) => k.id)).toEqual(["about", "events", "mixtape", "people", "made", "on-rotation"]);
    expect(slots.map((k) => k.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(slots[2].track).toBeNull();
    expect(slots[3].track?.id).toBe("people");
  });
  test("neighbours skips empty tracks and wraps", () => {
    const t = visibleTracks({ ...FIXTURES, music: [] });
    expect(neighbours(t, "events").next?.id).toBe("people");
    expect(neighbours(t, "people").prev?.id).toBe("events");
    expect(neighbours(t, "about").prev?.id).toBe("on-rotation");
    expect(neighbours(t, "on-rotation").next?.id).toBe("about");
  });
  test("legacy side b keys use two slots and blank the rest", () => {
    const t = visibleTracks(FIXTURES);
    expect(sideKeySlots(t, "b").map((k) => k.track?.id ?? null)).toEqual(["made", "on-rotation", null, null]);
    expect(sideKeySlots(t, "b").map((k) => k.index)).toEqual([0, 1, 2, 3]);
  });
  test("track numbers print with two digits", () => {
    expect(formatTrackNumber(1)).toBe("01");
    expect(formatTrackNumber(12)).toBe("12");
  });
});

describe("knob", () => {
  test("detents spread over 270 degrees", () => {
    const t = visibleTracks(FIXTURES);
    expect(knobAngle(t, "a", null)).toBe(-135);
    expect(knobAngle(t, "a", "about")).toBe(-135);
    expect(knobAngle(t, "a", "people")).toBe(135);
    expect(knobAngle(t, "a", "events")).toBe(-45);
    expect(knobAngle(t, "b", "made")).toBe(-135);
    expect(knobAngle(visibleTracks({ ...FIXTURES, shelf: [] }), "b", "made")).toBe(0); // one detent points up
  });
  test("a track on the other side leaves the knob at rest", () => {
    expect(knobAngle(visibleTracks(FIXTURES), "a", "made")).toBe(-135);
  });
});

describe("number keys", () => {
  test("fixed positions; an empty track's key and out of range are undefined", () => {
    const t = visibleTracks({ ...FIXTURES, music: [] });
    expect(trackForKey("1", t)?.id).toBe("about");
    expect(trackForKey("3", t)).toBeUndefined();
    expect(trackForKey("4", t)?.id).toBe("people");
    expect(trackForKey("6", t)?.id).toBe("on-rotation");
    expect(trackForKey("7", visibleTracks(FIXTURES))).toBeUndefined();
    expect(trackForKey("0", t)).toBeUndefined();
    expect(trackForKey("b", t)).toBeUndefined();
  });
  test("legacy side keys follow the current side", () => {
    const t = visibleTracks(FIXTURES);
    expect(sideTrackForKey("1", t, "b")?.id).toBe("made");
    expect(sideTrackForKey("3", t, "b")).toBeUndefined();
  });
});

describe("tape packs", () => {
  test("trade area: full left at 0, full right at 1, equal area at the middle", () => {
    const p = { min: 0.08, max: 0.2 };
    expect(packDiameters(0, p)).toEqual({ left: 0.2, right: 0.08 });
    expect(packDiameters(1, p)).toEqual({ left: 0.08, right: 0.2 });
    const m = packDiameters(0.5, p);
    expect(m.left).toBeCloseTo(m.right);
    expect(packDiameters(-1, p)).toEqual(packDiameters(0, p)); // clamped
    expect(packDiameters(2, p)).toEqual(packDiameters(1, p));
  });
});

describe("shouldHandleTrackKey", () => {
  const base = { key: "1", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: document.body };
  test("plain digit on the page", () => expect(shouldHandleTrackKey(base)).toBe(true));
  test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)("ignored with %s", (mod) => {
    expect(shouldHandleTrackKey({ ...base, [mod]: true })).toBe(false);
  });
  test("Shift+B still flips: a capital B is the same key", () => {
    expect(shouldHandleTrackKey({ ...base, key: "B", shiftKey: true })).toBe(true);
    expect(shouldHandleTrackKey({ ...base, key: "!", shiftKey: true })).toBe(false);
  });
  test.each(["input", "textarea", "select"])("ignored while typing in <%s>", (tag) => {
    expect(shouldHandleTrackKey({ ...base, target: document.createElement(tag) })).toBe(false);
  });
  test("ignored in contenteditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", ""); // jsdom doesn't reflect the contentEditable property
    const inner = document.createElement("span");
    div.append(inner);
    document.body.append(div);
    expect(shouldHandleTrackKey({ ...base, target: div })).toBe(false);
    expect(shouldHandleTrackKey({ ...base, target: inner })).toBe(false);
    div.remove();
  });
});
