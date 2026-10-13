import { expect, test } from "vitest";

test("matchMedia is controllable", async () => {
  const { setMedia } = await import("@/tests/media");
  setMedia("(prefers-reduced-motion: reduce)", true);
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
});
