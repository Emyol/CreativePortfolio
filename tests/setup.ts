import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { installMatchMedia, resetMedia } from "./media";

// Route handler tests run in the node environment, where there is no window.
const browser = typeof window !== "undefined";
if (browser) installMatchMedia();

class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// jsdom has no IntersectionObserver; tests that need one stub it locally.
if (browser) globalThis.IntersectionObserver ??= NoopIntersectionObserver as unknown as typeof IntersectionObserver;
// jsdom has no canvas either (it logs "Not implemented" for each one): no context, which
// the dot screen and the 3D views already handle by drawing nothing.
if (browser) HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

afterEach(() => {
  if (!browser) return;
  cleanup();
  resetMedia();
});
