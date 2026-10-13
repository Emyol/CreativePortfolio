import { afterEach, expect, test, vi } from "vitest";
import { scrollToId, setLenis } from "./navigate";

afterEach(() => {
  document.body.innerHTML = "";
  setLenis(null);
  history.replaceState(null, "", "/");
});

function chapter() {
  document.body.innerHTML = `<section id="music"><h2 data-chapter-heading tabindex="-1">Music</h2></section><main id="main" tabindex="-1"></main>`;
  Element.prototype.scrollIntoView = vi.fn();
}

test("focuses the chapter heading and updates the hash", () => {
  chapter();
  expect(scrollToId("music")).toBe(true);
  expect(document.activeElement?.textContent).toBe("Music");
  expect(location.hash).toBe("#music");
});

test("targets without a heading get focus themselves", () => {
  chapter();
  scrollToId("main");
  expect(document.activeElement?.id).toBe("main");
});

test("unknown ids do nothing", () => {
  chapter();
  expect(scrollToId("nope")).toBe(false);
  expect(location.hash).toBe("");
});

test("uses Lenis when active and focuses on completion", () => {
  chapter();
  const scrollTo = vi.fn((_el: unknown, opts: { onComplete?: () => void }) => opts.onComplete?.());
  setLenis({ scrollTo } as never);
  scrollToId("music", { push: false });
  expect(scrollTo).toHaveBeenCalledOnce();
  expect(document.activeElement?.textContent).toBe("Music");
  expect(location.hash).toBe("");
});
