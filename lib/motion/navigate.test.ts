import { afterEach, expect, test, vi } from "vitest";
import { scrollToId, setLenis } from "./navigate";

afterEach(() => {
  document.body.innerHTML = "";
  setLenis(null);
  history.replaceState(null, "", "/");
});

function track() {
  document.body.innerHTML = `<main id="main" tabindex="-1"><section id="mixtape" data-track="mixtape"><h2 data-track-heading tabindex="-1">Music</h2></section></main>`;
  Element.prototype.scrollIntoView = vi.fn();
}

test("focuses the track heading and updates the hash", () => {
  track();
  expect(scrollToId("mixtape")).toBe(true);
  expect(document.activeElement?.tagName).toBe("H2");
  expect(location.hash).toBe("#mixtape");
});

test("non-track targets get focus themselves, even when they contain tracks (skip link to main)", () => {
  track();
  scrollToId("main");
  expect(document.activeElement?.id).toBe("main");
});

test("unknown ids do nothing", () => {
  track();
  expect(scrollToId("nope")).toBe(false);
  expect(location.hash).toBe("");
});

test("uses Lenis when active and focuses on completion", () => {
  track();
  const scrollTo = vi.fn((_el: unknown, opts: { onComplete?: () => void }) => opts.onComplete?.());
  setLenis({ scrollTo, resize: vi.fn() } as never);
  scrollToId("mixtape", { push: false });
  expect(scrollTo).toHaveBeenCalledOnce();
  expect(document.activeElement?.tagName).toBe("H2");
  expect(location.hash).toBe("");
});

test("re-measures Lenis before jumping, so a page swap's new height is reachable", () => {
  track();
  const calls: string[] = [];
  setLenis({ resize: () => calls.push("resize"), scrollTo: () => calls.push("scrollTo") } as never);
  scrollToId("mixtape");
  expect(calls).toEqual(["resize", "scrollTo"]);
});
