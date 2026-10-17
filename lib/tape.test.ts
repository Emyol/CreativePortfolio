import { describe, expect, test } from "vitest";
import { FIXTURES } from "./content/fixtures";
import { parseContent } from "./content/load";
import type { SiteContent } from "./content/schema";
import seed from "./content/seed.json";
import {
  formatTrackNumber,
  hasSide,
  keySlots,
  knobAngle,
  packDiameters,
  shouldHandleTrackKey,
  sideOf,
  sideTracks,
  trackForKey,
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
  test("empty tracks close up the numbering", () => {
    const c = { ...FIXTURES, events: [], hobbies: [] };
    expect(visibleTracks(c).map((t) => `${t.id}:${t.number}`)).toEqual(["about:1", "mixtape:2", "people:3", "on-rotation:4"]);
  });
  test("about needs a letter, not just a toolbox", () => {
    expect(visibleTracks({ ...empty, about: { letter: [], toolbox: ["Git"] } })).toEqual([]);
  });
  test("an empty tape has no tracks, no side b, four blank keys", () => {
    const t = visibleTracks(empty);
    expect(t).toEqual([]);
    expect(hasSide(t, "b")).toBe(false);
    expect(keySlots(t, "a").map((k) => k.track)).toEqual([null, null, null, null]);
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
  test("side b keys use two slots and blank the rest", () => {
    const t = visibleTracks(FIXTURES);
    expect(keySlots(t, "b").map((k) => k.track?.id ?? null)).toEqual(["made", "on-rotation", null, null]);
    expect(keySlots(t, "b").map((k) => k.index)).toEqual([0, 1, 2, 3]);
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
  test("follow the current side; out of range is undefined", () => {
    const t = visibleTracks(FIXTURES);
    expect(trackForKey("1", t, "b")?.id).toBe("made");
    expect(trackForKey("3", t, "b")).toBeUndefined();
    expect(trackForKey("4", t, "a")?.id).toBe("people");
    expect(trackForKey("5", t, "a")).toBeUndefined();
    expect(trackForKey("0", t, "a")).toBeUndefined();
    expect(trackForKey("b", t, "a")).toBeUndefined();
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
