import { describe, expect, it } from "vitest";
import { deskHref, hashRedirect, parseDeskPath } from "./location";

describe("parseDeskPath", () => {
  it("reads the root as no track", () => {
    expect(parseDeskPath("/", "")).toEqual({ track: null, event: null });
  });
  it("reads a track", () => {
    expect(parseDeskPath("/on-rotation", "")).toEqual({ track: "on-rotation", event: null });
  });
  it("reads an event under events", () => {
    expect(parseDeskPath("/events/pycon-ph-2025", "")).toEqual({ track: "events", event: "pycon-ph-2025" });
  });
  it("strips the preview base", () => {
    expect(parseDeskPath("/admin/preview/people", "/admin/preview")).toEqual({ track: "people", event: null });
    expect(parseDeskPath("/admin/preview", "/admin/preview")).toEqual({ track: null, event: null });
  });
  it("ignores unknown segments", () => {
    expect(parseDeskPath("/tracklist", "")).toEqual({ track: null, event: null });
  });
  it("only events carry a slug, and trailing slashes are fine", () => {
    expect(parseDeskPath("/about/x", "")).toEqual({ track: "about", event: null });
    expect(parseDeskPath("/events/x/", "")).toEqual({ track: "events", event: "x" });
  });
});

describe("deskHref", () => {
  it("builds paths", () => {
    expect(deskHref("", { track: "events", event: "x" })).toBe("/events/x");
    expect(deskHref("", { track: "about", event: null })).toBe("/about");
    expect(deskHref("", { track: null, event: null })).toBe("/");
    expect(deskHref("/admin/preview", { track: null, event: null })).toBe("/admin/preview");
    expect(deskHref("/admin/preview", { track: "made", event: null })).toBe("/admin/preview/made");
  });
});

describe("hashRedirect", () => {
  it("maps old track hashes at the root", () => {
    expect(hashRedirect("/", "#events", "")).toBe("/events");
    expect(hashRedirect("/admin/preview", "#people", "/admin/preview")).toBe("/admin/preview/people");
  });
  it("leaves other hashes and paths alone", () => {
    expect(hashRedirect("/", "#main", "")).toBeNull();
    expect(hashRedirect("/about", "#events", "")).toBeNull();
  });
});
