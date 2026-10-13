import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { installMatchMedia, resetMedia } from "./media";

installMatchMedia();

class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// jsdom has no IntersectionObserver; tests that need one stub it locally.
globalThis.IntersectionObserver ??= NoopIntersectionObserver as unknown as typeof IntersectionObserver;

afterEach(() => {
  cleanup();
  resetMedia();
});
