import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMedia } from "@/tests/media";
import { parseDeskPath } from "./location";
import { __resetNightForTests, initialNight, nightOn, setNight, subscribeNight } from "./night";
import { NIGHT_PREPAINT, isDeskPath } from "./nightPrepaint";

beforeEach(() => {
  localStorage.clear();
  __resetNightForTests();
});
afterEach(() => vi.restoreAllMocks());

describe("night", () => {
  it("starts from the system preference when there is no stored choice", () => {
    expect(initialNight(true)).toBe(true);
    expect(initialNight(false)).toBe(false);
  });

  it("lets a stored choice win over the system preference", () => {
    setNight(false);
    expect(initialNight(true)).toBe(false);
    setNight(true);
    expect(initialNight(false)).toBe(true);
    expect(localStorage.getItem("side-a:night")).toBe("on");
  });

  it("reads the system's dark preference on first use", () => {
    setMedia("(prefers-color-scheme: dark)", true);
    expect(nightOn()).toBe(true);
  });

  it("tells every subscriber, so the cord and the transport agree", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeNight(a);
    subscribeNight(b);
    setNight(true);
    offA();
    setNight(false);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledTimes(2);
    expect(nightOn()).toBe(false);
  });

  it("still switches when storage throws (private windows)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setNight(true);
    expect(nightOn()).toBe(true);
    expect(initialNight(false)).toBe(false);
  });
});

describe("the night pre-paint script", () => {
  const html = document.documentElement;
  const run = (path: string) => {
    history.replaceState(null, "", path);
    delete html.dataset.night;
    new Function(NIGHT_PREPAINT)();
    return "night" in html.dataset;
  };
  afterEach(() => {
    history.replaceState(null, "", "/");
    delete html.dataset.night;
  });

  it("sets the night room before paint by the same rule as the desk: the stored choice, else the system's", () => {
    setMedia("(prefers-color-scheme: dark)", true);
    expect(run("/")).toBe(true);
    localStorage.setItem("side-a:night", "off");
    expect(run("/")).toBe(false);
    setMedia("(prefers-color-scheme: dark)", false);
    localStorage.setItem("side-a:night", "on");
    expect(run("/events/fixture-event-1")).toBe(true);
    localStorage.clear();
    expect(run("/events")).toBe(false);
  });

  it("only on the desk's routes, public and preview", () => {
    localStorage.setItem("side-a:night", "on");
    for (const path of ["/", "/about", "/events", "/events/some-slug", "/on-rotation/", "/admin/preview", "/admin/preview/made", "/admin/preview/events/x"]) expect(run(path), path).toBe(true);
    for (const path of ["/tracklist", "/admin", "/admin/previewer", "/nope", "/about/more", "/events/a/b"]) expect(run(path), path).toBe(false);
  });

  it("agrees with the desk on which paths are its own", () => {
    for (const path of ["/", "/about", "/events/x", "/admin/preview", "/admin/preview/people", "/tracklist", "/admin", "/nope"]) {
      const base = path.startsWith("/admin/preview") ? "/admin/preview" : "";
      const desk = path === (base || "/") || parseDeskPath(path, base).track !== null;
      expect(isDeskPath(path), path).toBe(desk);
    }
  });

  it("leaves the day room when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run("/")).toBe(false);
  });
});
