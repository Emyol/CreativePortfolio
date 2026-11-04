import { afterEach, describe, expect, it } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { visibleTracks } from "@/lib/tape";
import { deskKeyAction, type KeyLike } from "./keyboard";
import type { DeskLocation } from "./location";

const tracks = visibleTracks(FIXTURES);
const DESK: DeskLocation = { track: null, event: null };
const AT_EVENTS: DeskLocation = { track: "events", event: null };

const key = (k: string, target: EventTarget | null = document.body, mods: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target,
  ...mods,
});

/** A J-card as the desk prints it: the title, a flap link, and a device panel. */
function card() {
  document.body.innerHTML = `
    <main data-jcard="events">
      <h2 tabindex="-1">events</h2>
      <nav data-panel="flap"><a href="/about">01 about</a></nav>
      <section data-panel="device"><div data-device><button>open</button></div></section>
      <aside data-panel="liner"><input aria-label="note" /></aside>
    </main>`;
  const q = (s: string) => document.querySelector(s)!;
  return { title: q("h2"), flapLink: q("[data-panel=flap] a"), device: q("[data-device] button"), input: q("input") };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("deskKeyAction", () => {
  const s = (loc: DeskLocation, extra: Partial<{ keysOn: boolean; base: string; tracks: typeof tracks }> = {}) => ({
    loc,
    tracks,
    keysOn: true,
    ...extra,
  });

  it("loads track 3 (mixtape) on 3", () => {
    expect(deskKeyAction(key("3"), s(DESK))).toEqual({ kind: "go", href: "/mixtape" });
  });

  it("keeps the base on the admin preview", () => {
    expect(deskKeyAction(key("3"), s(DESK, { base: "/admin/preview" }))).toEqual({ kind: "go", href: "/admin/preview/mixtape" });
  });

  it("does nothing on 3 when the track keys are off (WCAG 2.1.4)", () => {
    expect(deskKeyAction(key("3"), s(DESK, { keysOn: false }))).toBeNull();
  });

  it("does nothing on 3 when mixtape is empty: its key is blank", () => {
    expect(deskKeyAction(key("3"), s(DESK, { tracks: tracks.filter((t) => t.id !== "mixtape") }))).toBeNull();
  });

  it("ignores digits typed into a field and digits with a modifier", () => {
    const { input } = card();
    expect(deskKeyAction(key("3", input), s(AT_EVENTS))).toBeNull();
    expect(deskKeyAction(key("3", document.body, { ctrlKey: true }), s(DESK))).toBeNull();
  });

  it("does nothing on the digit of the track that is already in", () => {
    expect(deskKeyAction(key("2"), s(AT_EVENTS))).toBeNull();
  });

  it("goes to the track on its digit from one of its events", () => {
    expect(deskKeyAction(key("2"), s({ track: "events", event: "x" }))).toEqual({ kind: "go", href: "/events" });
  });

  it("steps back on Escape, wherever focus is", () => {
    expect(deskKeyAction(key("Escape"), s(AT_EVENTS))).toEqual({ kind: "back" });
    const { input } = card();
    expect(deskKeyAction(key("Escape", input), s(AT_EVENTS))).toEqual({ kind: "back" });
  });

  it("steps back on Backspace only outside fields", () => {
    const { input, title } = card();
    expect(deskKeyAction(key("Backspace", title), s(AT_EVENTS))).toEqual({ kind: "back" });
    expect(deskKeyAction(key("Backspace", input), s(AT_EVENTS))).toBeNull();
  });

  it("moves to the neighbour on ←/→ from the J-card frame", () => {
    const { title, flapLink } = card();
    expect(deskKeyAction(key("ArrowRight", title), s(AT_EVENTS))).toEqual({ kind: "go", href: "/mixtape" });
    expect(deskKeyAction(key("ArrowLeft", flapLink), s(AT_EVENTS))).toEqual({ kind: "go", href: "/about" });
  });

  it("leaves ←/→ inside a device to the device", () => {
    const { device } = card();
    expect(deskKeyAction(key("ArrowRight", device), s(AT_EVENTS))).toBeNull();
  });

  it("leaves ←/→ alone outside the J-card and on the desk", () => {
    card();
    expect(deskKeyAction(key("ArrowRight", document.body), s(AT_EVENTS))).toBeNull();
    expect(deskKeyAction(key("ArrowRight", document.querySelector("h2")), s(DESK))).toBeNull();
  });

  it("skips an empty neighbour", () => {
    const { title } = card();
    const noMixtape = tracks.filter((t) => t.id !== "mixtape");
    expect(deskKeyAction(key("ArrowRight", title), s(AT_EVENTS, { tracks: noMixtape }))).toEqual({ kind: "go", href: "/people" });
  });

  it("ignores other keys", () => {
    expect(deskKeyAction(key("a"), s(AT_EVENTS))).toBeNull();
    expect(deskKeyAction(key("7"), s(AT_EVENTS))).toBeNull();
  });
});
